'use strict';

self.window = self;
importScripts(
  '/assets/js/doudizhu/engine.js?v=20260801g4b',
  '/assets/js/doudizhu/policy.js?v=20260801g4b',
  '/assets/js/doudizhu/net.js?v=20260801g7a'
);

let activeModel = null;
let loadPromise = null;
let evaluators = [];
let evaluatorSequence = 0;
const EVALUATOR_URL = '/assets/js/doudizhu/ai-eval-worker.js?v=20260801g7a';

function errorCode(error) {
  const message = String(error && error.message ? error.message : error);
  if (/allocation|memory|heap|out of memory/i.test(message)) return 'model_oom';
  return message.slice(0, 240);
}

function applyLocalTestFault(fault, phase) {
  if (!/^(localhost|127\.0\.0\.1)$/.test(self.location.hostname) || !fault) return;
  if (phase === 'load' && fault === '404') throw new Error('model_http_404:test');
  if (phase === 'load' && fault === 'truncated') throw new Error('model_size_17:test');
  if (phase === 'load' && fault === 'oom') throw new Error('model_oom');
  if (phase === 'choose' && fault === 'nan') throw new Error('model_output_invalid:non_finite_test');
}

function stopEvaluators() {
  for (const worker of evaluators) worker.terminate();
  evaluators = [];
}

function waitForEvaluatorLoad(worker, model, index, progress) {
  return new Promise((resolve, reject) => {
    const onMessage = event => {
      const message = event.data || {};
      if (message.type === 'progress') {
        progress[index] = Number(message.value) || 0;
        self.postMessage({
          type: 'progress',
          model,
          value: progress.reduce((sum, value) => sum + value, 0) / progress.length,
        });
      } else if (message.type === 'ready') {
        cleanup();
        resolve();
      } else if (message.type === 'error') {
        cleanup();
        reject(new Error(message.error || 'model_evaluator_load_failed'));
      }
    };
    const onError = event => { cleanup(); reject(new Error(event.message || 'model_evaluator_error')); };
    function cleanup() {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    }
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ type: 'load', model });
  });
}

function scoreWithEvaluator(worker, payload) {
  return new Promise((resolve, reject) => {
    const id = ++evaluatorSequence;
    const onMessage = event => {
      const message = event.data || {};
      if (message.id !== id) return;
      cleanup();
      if (message.type === 'error') reject(new Error(message.error || 'model_evaluator_failed'));
      else if (!Number.isFinite(message.q)) reject(new Error('model_output_invalid:resnet'));
      else resolve(message.q);
    };
    const onError = event => { cleanup(); reject(new Error(event.message || 'model_evaluator_error')); };
    function cleanup() {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    }
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ type: 'score', id, ...payload });
  });
}

function boundedResnetMoves(hand, prev) {
  const candidates = self.DDZEngine.enumerateBeats(hand, prev)
    .map(move => ({ move, cards: move.cards.slice() }));
  if (prev) candidates.push({ move: null, cards: null });
  if (candidates.length <= 2) return candidates;
  const plays = candidates.filter(candidate => candidate.move).sort((a, b) => {
    const aBomb = a.move.type === self.DDZEngine.TYPES.BOMB || a.move.type === self.DDZEngine.TYPES.ROCKET;
    const bBomb = b.move.type === self.DDZEngine.TYPES.BOMB || b.move.type === self.DDZEngine.TYPES.ROCKET;
    if (aBomb !== bBomb) return aBomb ? 1 : -1;
    if (!prev && a.move.cards.length !== b.move.cards.length) {
      return b.move.cards.length - a.move.cards.length;
    }
    return a.move.weight - b.move.weight || a.move.cards.length - b.move.cards.length;
  });
  if (prev) return [plays[0], candidates.find(candidate => !candidate.move)];
  return plays.slice(0, 2);
}

async function load(model, testFault) {
  if (/^(localhost|127\.0\.0\.1)$/.test(self.location.hostname) && testFault === 'slow') {
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  applyLocalTestFault(testFault, 'load');
  if (activeModel === model && self.DDZNet.ready(model)) return;
  if (activeModel === model && model === 'resnet' && evaluators.length === 2) return;
  if (!loadPromise) {
    loadPromise = (model === 'resnet' ? (async () => {
      stopEvaluators();
      evaluators = [new Worker(EVALUATOR_URL), new Worker(EVALUATOR_URL)];
      const progress = [0, 0];
      await Promise.all(evaluators.map((worker, index) =>
        waitForEvaluatorLoad(worker, model, index, progress)));
    })() : self.DDZNet.ensureModel(model, {
      onProgress(value) { self.postMessage({ type: 'progress', model, value }); },
    })).then(() => {
      activeModel = model;
      if (model !== 'resnet') self.DDZNet.releaseExcept(model);
      self.postMessage({ type: 'ready', model });
    }).catch(error => {
      stopEvaluators();
      throw error;
    }).finally(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

self.onmessage = async function (event) {
  const message = event.data || {};
  if (message.type === 'load') {
    try {
      await load(message.model, message.testFault);
    } catch (error) {
      self.postMessage({ type: 'load-error', model: message.model, error: errorCode(error) });
    }
    return;
  }
  if (message.type !== 'choose') return;
  const startedAt = performance.now();
  try {
    await load(message.model, message.testFault);
    applyLocalTestFault(message.testFault, 'choose');
    let move;
    if (message.model === 'resnet') {
      const candidates = boundedResnetMoves(message.hand, message.prev);
      if (!candidates.length) throw new Error('model_illegal_lead');
      const qs = await Promise.all(candidates.map((candidate, index) =>
        scoreWithEvaluator(evaluators[index], {
          model: message.model,
          seat: message.seat,
          hand: message.hand,
          prev: message.prev,
          state: message.state,
          cards: candidate.cards,
        })));
      let best = 0;
      for (let index = 1; index < qs.length; index++) if (qs[index] > qs[best]) best = index;
      move = candidates[best].move;
    } else {
      move = self.DDZNet.choose(
        message.model, message.seat, message.hand, message.prev, message.state
      );
    }
    if (!move && !message.prev) throw new Error('model_illegal_lead');
    if (move && !self.DDZEngine.validatePlay(message.hand, move.cards, message.prev)) {
      throw new Error('model_illegal_action');
    }
    self.postMessage({
      type: 'choice',
      requestId: message.requestId,
      gameEpoch: message.gameEpoch,
      turnRevision: message.turnRevision,
      cards: move ? move.cards.slice() : null,
      durationMs: performance.now() - startedAt,
      model: message.model,
    });
  } catch (error) {
    self.postMessage({
      type: 'choice-error',
      requestId: message.requestId,
      gameEpoch: message.gameEpoch,
      turnRevision: message.turnRevision,
      error: errorCode(error),
      model: message.model,
    });
  }
};
