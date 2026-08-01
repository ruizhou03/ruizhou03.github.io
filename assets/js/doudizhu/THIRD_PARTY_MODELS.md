# Doudizhu model provenance and licenses

The `weights/` artifacts are quantized derivatives of the checkpoints pinned in
`model-manifest.json`. They are not anonymous site assets and must not be
updated without changing the manifest hashes and rerunning parity tests.

- `adp_*`: DouZero by Kwai, pinned at commit
  `718a5c920bf3361e34178a38f3b80458e176b351`, licensed under Apache-2.0.
  The complete license is included as `licenses/DouZero-APACHE-2.0.txt`.
- `resnet_*`: AlphaDou by RuBP17, pinned at commit
  `13e740c08c3b653c2bef6ca345fc8fa6adc7d362`, licensed under GPL-3.0-only.
  The complete license is included as `licenses/AlphaDou-GPL-3.0.txt`.

Corresponding source is available at the repository URLs and exact commits in
`model-manifest.json`. The deployed JavaScript inference adapter and manifest
are part of this site's public source repository. The conversion procedure is
documented in `tools/doudizhu/MODEL_BUILD.md`.
