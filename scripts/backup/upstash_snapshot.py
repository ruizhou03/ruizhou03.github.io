#!/usr/bin/env python3
"""Logical backup and guarded restore for the site's Upstash Redis database.

The snapshot uses Upstash's REST API directly and stores Redis string payloads
as base64 so JSON-looking values are not accidentally re-serialized. Supported
types cover the site's current data model: string, hash, list, set, sorted set,
stream, and Redis JSON.
"""

from __future__ import annotations

import argparse
import base64
import collections
import datetime as dt
import gzip
import json
import os
import pathlib
import sys
import tempfile
import urllib.error
import urllib.request


FORMAT = "zircon-upstash-logical-v1"
SUPPORTED = {"string", "hash", "list", "set", "zset", "stream", "rejson-rl", "json"}


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def b64decode_text(value: str) -> str:
    raw = base64.b64decode(value.encode("ascii"), validate=True)
    return raw.decode("utf-8")


class Upstash:
    def __init__(self) -> None:
        self.url = os.environ.get("UPSTASH_REDIS_REST_URL", "").rstrip("/")
        self.token = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "")
        if not self.url or not self.token:
            raise SystemExit("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required")

    def _post(self, suffix: str, payload: object, encoded: bool = False) -> object:
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        if encoded:
            headers["Upstash-Encoding"] = "base64"
        request = urllib.request.Request(
            self.url + suffix,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                body = json.load(response)
        except urllib.error.HTTPError as exc:
            detail = exc.read(1000).decode("utf-8", "replace")
            raise RuntimeError(f"Upstash HTTP {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Upstash request failed: {exc.reason}") from exc
        return body

    def command(self, *parts: object, encoded: bool = False) -> object:
        body = self._post("", list(parts), encoded=encoded)
        if not isinstance(body, dict) or "result" not in body:
            raise RuntimeError(f"Unexpected Upstash response: {body!r}")
        return body["result"]

    def pipeline(self, commands: list[list[object]], encoded: bool = False,
                 transaction: bool = False) -> list[object]:
        suffix = "/multi-exec" if transaction else "/pipeline"
        body = self._post(suffix, commands, encoded=encoded)
        if not isinstance(body, list) or len(body) != len(commands):
            raise RuntimeError("Unexpected Upstash pipeline response length")
        results: list[object] = []
        for item in body:
            if not isinstance(item, dict):
                raise RuntimeError(f"Unexpected Upstash pipeline item: {item!r}")
            if item.get("error"):
                raise RuntimeError(f"Upstash command failed: {item['error']}")
            results.append(item.get("result"))
        return results


def value_command(key: str, redis_type: str) -> list[object]:
    if redis_type == "string":
        return ["GET", key]
    if redis_type == "hash":
        return ["HGETALL", key]
    if redis_type == "list":
        return ["LRANGE", key, 0, -1]
    if redis_type == "set":
        return ["SMEMBERS", key]
    if redis_type == "zset":
        return ["ZRANGE", key, 0, -1, "WITHSCORES"]
    if redis_type == "stream":
        return ["XRANGE", key, "-", "+"]
    if redis_type in {"rejson-rl", "json"}:
        return ["JSON.GET", key, "$"]
    raise RuntimeError(f"Unsupported Redis type {redis_type!r}")


def snapshot(output: pathlib.Path, scan_count: int) -> None:
    client = Upstash()
    started = utc_now()
    dbsize_before = int(client.command("DBSIZE"))
    cursor = "0"
    seen: set[str] = set()
    records: list[dict[str, object]] = []

    while True:
        result = client.command("SCAN", cursor, "COUNT", scan_count)
        if not isinstance(result, list) or len(result) != 2:
            raise RuntimeError(f"Unexpected SCAN response: {result!r}")
        cursor = str(result[0])
        keys = [str(k) for k in (result[1] or []) if str(k) not in seen]
        seen.update(keys)
        if keys:
            metadata_commands: list[list[object]] = []
            for key in keys:
                metadata_commands.extend((["TYPE", key], ["PTTL", key]))
            metadata = client.pipeline(metadata_commands)

            live: list[tuple[str, str, int]] = []
            for index, key in enumerate(keys):
                redis_type = str(metadata[index * 2]).lower()
                pttl = int(metadata[index * 2 + 1])
                if redis_type == "none":
                    continue
                if redis_type not in SUPPORTED:
                    raise RuntimeError(f"Unsupported Redis type {redis_type!r}; snapshot aborted")
                live.append((key, redis_type, pttl))

            values = client.pipeline(
                [value_command(key, redis_type) for key, redis_type, _ in live],
                encoded=True,
            ) if live else []
            captured_ms = int(utc_now().timestamp() * 1000)
            for (key, redis_type, pttl), value in zip(live, values):
                # The key may expire between TYPE/PTTL and the value read. Redis
                # cannot retain an empty collection, so [] is also an expired key.
                if value is None or value == []:
                    continue
                records.append({
                    "key": key,
                    "type": redis_type,
                    "expires_at_ms": captured_ms + pttl if pttl >= 0 else None,
                    "value_b64": value,
                })

        if cursor == "0":
            break

    dbsize_after = int(client.command("DBSIZE"))
    records.sort(key=lambda item: str(item["key"]))
    type_counts = collections.Counter(str(item["type"]) for item in records)
    payload = {
        "format": FORMAT,
        "created_at": started.isoformat().replace("+00:00", "Z"),
        "dbsize_before": dbsize_before,
        "dbsize_after": dbsize_after,
        "record_count": len(records),
        "type_counts": dict(sorted(type_counts.items())),
        "records": records,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("wb", dir=output.parent, delete=False) as raw:
        temp_path = pathlib.Path(raw.name)
        with gzip.GzipFile(fileobj=raw, mode="wb", mtime=0) as zipped:
            zipped.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    temp_path.replace(output)
    print(json.dumps({
        "ok": True,
        "records": len(records),
        "dbsize_before": dbsize_before,
        "dbsize_after": dbsize_after,
        "types": payload["type_counts"],
        "consistent_size": dbsize_before == dbsize_after,
    }, ensure_ascii=False))


def load_snapshot(path: pathlib.Path) -> dict[str, object]:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        payload = json.load(handle)
    if payload.get("format") != FORMAT:
        raise RuntimeError(f"Unsupported snapshot format: {payload.get('format')!r}")
    records = payload.get("records")
    if not isinstance(records, list):
        raise RuntimeError("Snapshot records are missing")
    keys: set[str] = set()
    for record in records:
        if not isinstance(record, dict):
            raise RuntimeError("Malformed snapshot record")
        key = record.get("key")
        redis_type = str(record.get("type", "")).lower()
        if not isinstance(key, str) or not key:
            raise RuntimeError("Snapshot contains an invalid key")
        if key in keys:
            raise RuntimeError(f"Snapshot contains duplicate key {key!r}")
        if redis_type not in SUPPORTED:
            raise RuntimeError(f"Snapshot contains unsupported type {redis_type!r}")
        keys.add(key)
    if int(payload.get("record_count", -1)) != len(records):
        raise RuntimeError("Snapshot record count does not match payload")
    return payload


def restore_commands(record: dict[str, object], overwrite: bool) -> list[list[object]]:
    key = str(record["key"])
    redis_type = str(record["type"]).lower()
    value = record.get("value_b64")
    commands: list[list[object]] = [["DEL", key]] if overwrite else []

    if redis_type == "string":
        commands.append(["SET", key, b64decode_text(str(value))])
    elif redis_type == "hash":
        decoded = [b64decode_text(str(item)) for item in (value or [])]
        commands.append(["HSET", key, *decoded])
    elif redis_type == "list":
        decoded = [b64decode_text(str(item)) for item in (value or [])]
        commands.append(["RPUSH", key, *decoded])
    elif redis_type == "set":
        decoded = [b64decode_text(str(item)) for item in (value or [])]
        commands.append(["SADD", key, *decoded])
    elif redis_type == "zset":
        decoded = [b64decode_text(str(item)) for item in (value or [])]
        if len(decoded) % 2:
            raise RuntimeError(f"Malformed zset payload for {key!r}")
        args: list[str] = []
        for index in range(0, len(decoded), 2):
            args.extend((decoded[index + 1], decoded[index]))
        commands.append(["ZADD", key, *args])
    elif redis_type == "stream":
        for entry in value or []:
            if not isinstance(entry, list) or len(entry) != 2:
                raise RuntimeError(f"Malformed stream payload for {key!r}")
            entry_id = b64decode_text(str(entry[0]))
            fields = [b64decode_text(str(item)) for item in entry[1]]
            commands.append(["XADD", key, entry_id, *fields])
    elif redis_type in {"rejson-rl", "json"}:
        commands.append(["JSON.SET", key, "$", b64decode_text(str(value))])

    expires_at = record.get("expires_at_ms")
    if expires_at is not None:
        commands.append(["PEXPIREAT", key, int(expires_at)])
    return commands


def restore(path: pathlib.Path, apply: bool, allow_overwrite: bool, confirm: str) -> None:
    payload = load_snapshot(path)
    records = payload["records"]
    print(json.dumps({
        "format": payload["format"],
        "created_at": payload["created_at"],
        "records": len(records),
        "types": payload.get("type_counts", {}),
        "mode": "apply" if apply else "dry-run",
    }, ensure_ascii=False))
    if not apply:
        return
    if confirm != "RESTORE_UPSTASH":
        raise SystemExit("Restore requires --confirm RESTORE_UPSTASH")

    client = Upstash()
    target_size = int(client.command("DBSIZE"))
    if target_size and not allow_overwrite:
        raise SystemExit(
            f"Target Redis contains {target_size} keys; use --allow-overwrite only after verifying the target"
        )

    restored = skipped = 0
    for record in records:
        key = str(record["key"])
        exists = int(client.command("EXISTS", key)) > 0
        if exists and not allow_overwrite:
            skipped += 1
            continue
        commands = restore_commands(record, overwrite=exists and allow_overwrite)
        if commands:
            client.pipeline(commands, transaction=True)
            restored += 1
    print(json.dumps({"ok": True, "restored": restored, "skipped": skipped}, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("snapshot")
    create.add_argument("--output", required=True, type=pathlib.Path)
    create.add_argument("--scan-count", type=int, default=200)
    validate = sub.add_parser("validate")
    validate.add_argument("snapshot", type=pathlib.Path)
    recover = sub.add_parser("restore")
    recover.add_argument("snapshot", type=pathlib.Path)
    recover.add_argument("--apply", action="store_true")
    recover.add_argument("--allow-overwrite", action="store_true")
    recover.add_argument("--confirm", default="")
    args = parser.parse_args()

    try:
        if args.command == "snapshot":
            snapshot(args.output, args.scan_count)
        elif args.command == "validate":
            payload = load_snapshot(args.snapshot)
            print(json.dumps({"ok": True, "records": payload["record_count"], "types": payload["type_counts"]}))
        else:
            restore(args.snapshot, args.apply, args.allow_overwrite, args.confirm)
    except (RuntimeError, ValueError, OSError, json.JSONDecodeError) as exc:
        print(f"backup error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
