#!/usr/bin/env python3
"""Reproducibly convert the pinned DanZero numpy checkpoint to the site format."""

from __future__ import annotations

import argparse
import hashlib
import pickle
from pathlib import Path

import numpy as np

SOURCE_SHA256 = "a6f132e50e205709c0efdb1b550d935c5bfc313b21726b0e70e300b6cd7ea1a3"
OUTPUT_SHA256 = "ca389e89e8db98d9968705b0e4495620e025c852cf4db4b4c2e66b086ae03da5"
SHAPES = [
    (567, 512), (512,),
    (512, 512), (512,),
    (512, 512), (512,),
    (512, 512), (512,),
    (512, 512), (512,),
    (512, 1), (1,),
]


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def convert(source: bytes) -> bytes:
    if digest(source) != SOURCE_SHA256:
        raise ValueError("source SHA-256 does not match the pinned checkpoint")
    # The pinned file is a pickle of plain numpy arrays. Verifying its exact
    # digest before unpickling is mandatory because pickle is executable.
    arrays = pickle.loads(source)
    if not isinstance(arrays, list) or len(arrays) != len(SHAPES):
        raise ValueError("unexpected checkpoint tensor list")
    normalized = []
    for index, (array, shape) in enumerate(zip(arrays, SHAPES)):
        value = np.asarray(array, dtype="<f4")
        if value.shape != shape:
            raise ValueError(f"tensor {index} shape {value.shape}, expected {shape}")
        normalized.append(value)

    quantized = []
    biases = []
    scales = []
    for index in range(0, len(normalized), 2):
        weights = normalized[index]
        bias = normalized[index + 1]
        scale = np.max(np.abs(weights), axis=0) / np.float32(127.0)
        scale = np.where(scale == 0, np.float32(1.0), scale).astype("<f4")
        packed = np.rint(weights / scale).clip(-127, 127).astype(np.int8)
        quantized.append(packed.reshape(-1))
        biases.append(bias.astype("<f4").reshape(-1))
        scales.append(scale.reshape(-1))

    output = b"".join(array.tobytes() for array in quantized + biases + scales)
    if digest(output) != OUTPUT_SHA256:
        raise ValueError("converted artifact SHA-256 does not match the manifest")
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    output = convert(args.source.read_bytes())
    args.output.write_bytes(output)
    print(f"{args.output}: {len(output)} bytes sha256={digest(output)}")


if __name__ == "__main__":
    main()
