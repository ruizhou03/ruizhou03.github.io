'use strict';

importScripts('/assets/js/games/guandan-ai-contract.js?v=20260727ai5');
importScripts('/assets/js/games/guandan-dmc.js?v=20260727ai5');

var MODEL_URL = '/assets/js/games/guandan-dmc.bin?v=ca389e89e8db';
var MODEL_BYTES = 1359880;

function hex(bytes) {
  return Array.from(new Uint8Array(bytes), function (value) {
    return value.toString(16).padStart(2, '0');
  }).join('');
}

async function loadModel() {
  var response = await fetch(MODEL_URL, { cache: 'force-cache' });
  if (!response.ok) throw new Error('model_http_' + response.status);
  var reader = response.body && response.body.getReader ? response.body.getReader() : null;
  var buffer;
  if (!reader) {
    buffer = await response.arrayBuffer();
  } else {
    var chunks = [];
    var received = 0;
    while (true) {
      var result = await reader.read();
      if (result.done) break;
      chunks.push(result.value);
      received += result.value.byteLength;
      self.postMessage({ type: 'progress', value: Math.min(0.999, received / MODEL_BYTES) });
    }
    var packed = new Uint8Array(received);
    var offset = 0;
    chunks.forEach(function (chunk) {
      packed.set(chunk, offset);
      offset += chunk.byteLength;
    });
    buffer = packed.buffer;
  }
  if (buffer.byteLength !== MODEL_BYTES) throw new Error('model_size_' + buffer.byteLength);
  var digest = hex(await crypto.subtle.digest('SHA-256', buffer));
  if (digest !== GuandanAIContract.modelSha256) throw new Error('model_sha256_' + digest);
  GuandanDMC.loadWeights(buffer);
  self.postMessage({
    type: 'ready',
    modelSha256: digest,
    strategyId: GuandanAIContract.strategies.hard.id,
  });
}

var loading = null;
self.onmessage = function (event) {
  var message = event.data || {};
  if (message.type === 'load') {
    if (!loading) {
      loading = loadModel().catch(function (error) {
        self.postMessage({ type: 'error', error: String(error && error.message || error) });
        loading = null;
      });
    }
    return;
  }
  if (message.type !== 'choose') return;
  try {
    if (!GuandanDMC.ready()) throw new Error('model_not_ready');
    var debug = message.debug ? [] : null;
    var choice = GuandanDMC.choose(message.state, message.moves, message.leading, debug);
    self.postMessage({
      type: 'choice',
      requestId: message.requestId,
      cards: choice && choice.cards ? choice.cards.slice() : null,
      debug: debug,
    });
  } catch (error) {
    self.postMessage({
      type: 'choice-error',
      requestId: message.requestId,
      error: String(error && error.message || error),
    });
  }
};
