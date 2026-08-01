'use strict';

self.window = self;
importScripts(
  '/assets/js/doudizhu/engine.js?v=20260801g4b',
  '/assets/js/doudizhu/net.js?v=20260801g4b'
);

function code(error) {
  const message = String(error && error.message ? error.message : error);
  if (/allocation|memory|heap|out of memory/i.test(message)) return 'model_oom';
  return message.slice(0, 240);
}

self.onmessage = async event => {
  const message = event.data || {};
  if (message.type === 'load') {
    try {
      await self.DDZNet.ensureModel(message.model, {
        onProgress(value) {
          self.postMessage({ type: 'progress', value });
        },
      });
      self.postMessage({ type: 'ready', model: message.model });
    } catch (error) {
      self.postMessage({ type: 'error', id: message.id, error: code(error) });
    }
    return;
  }
  if (message.type !== 'score') return;
  try {
    const qs = self.DDZNet._scoreActions(
      message.model,
      message.seat,
      message.hand,
      message.prev,
      message.state,
      [message.cards],
    );
    self.postMessage({ type: 'score', id: message.id, q: qs[0] });
  } catch (error) {
    self.postMessage({ type: 'error', id: message.id, error: code(error) });
  }
};
