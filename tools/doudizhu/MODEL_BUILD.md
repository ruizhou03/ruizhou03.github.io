# Rebuilding the Doudizhu model artifacts

This is the reproducibility contract for the deployed ADP and ResNet weights.

1. Check out the exact upstream commits and verify the three checkpoint
   SHA-256 values listed in `assets/js/doudizhu/model-manifest.json`.
2. Export each PyTorch state dict to a little-endian float32 tensor stream plus
   a JSON parameter table preserving parameter name, shape, offset and count.
3. Quantize ADP non-LSTM matrix tensors to per-output-channel int16. Retain ADP
   LSTM tensors and one-dimensional tensors as float32.
4. Quantize ResNet matrix/convolution tensors to per-output-channel int8. Retain
   biases and batch-normalization tensors as float32.
5. Run Python-versus-JavaScript encoder and forward-pass parity fixtures for all
   three positions. A build is rejected on any selected-move mismatch.
   Production ResNet inference applies a deterministic two-candidate latency
   budget after canonical legal-action generation. Follow turns retain the
   cheapest legal play plus pass; lead turns retain two strong structural
   leads. The browser evaluates those two candidates concurrently in isolated
   workers; the backend uses its bounded worker. This never bypasses the
   canonical validator.
6. Copy the resulting `.json`, `.qw` and `.f32` files into the site and backend,
   regenerate exact byte counts and SHA-256 values in both manifests, and run:

       node tools/doudizhu/ai-contract.test.mjs
       npm test  # in backends/urge

7. Retain the upstream license files and this build record with every release.

The original conversion workspace used `dump_parity_adp.py`,
`dump_parity_resnet.py`, `ddz_encode.js`, `ddz_net.js`, and `quantize.py`.
Those names are recorded so a future rebuild can be compared against the
original pipeline rather than silently inventing a new artifact format.
