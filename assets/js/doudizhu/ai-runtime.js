(function () {
  'use strict';

  const POLICY = window.DDZPolicy;
  const WORKER_URL = '/assets/js/doudizhu/ai-worker.js?v=20260801g8b';
  const REQUEST_TIMEOUT_MS = 30_000;
  let worker = null;
  let workerModel = null;
  let workerReady = false;
  let generation = 0;
  let sequence = 0;
  let loadState = null;
  const pending = new Map();

  function localTestFault() {
    if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return null;
    return new URLSearchParams(location.search).get('ddzAiFault');
  }

  function runtimeError(code, cause) {
    const error = new Error(code);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function rejectPending(error) {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
  }

  function stopWorker(reason) {
    generation++;
    const current = worker;
    worker = null;
    workerModel = null;
    workerReady = false;
    if (loadState) loadState.reject(runtimeError(reason || 'model_cancelled'));
    loadState = null;
    rejectPending(runtimeError(reason || 'model_cancelled'));
    if (current) {
      console.info(`[DDZAI] worker stopped: ${reason || 'model_cancelled'}`);
      current.terminate();
    }
  }

  function ensureWorker(model, onProgress) {
    if (worker && workerModel === model) {
      if (loadState) loadState.onProgress = onProgress || loadState.onProgress;
      return worker;
    }
    if (worker) stopWorker('model_switched');
    if (typeof Worker === 'undefined') throw runtimeError('model_worker_unavailable');
    const localGeneration = ++generation;
    const next = new Worker(WORKER_URL);
    worker = next;
    workerModel = model;
    workerReady = false;
    next.onmessage = event => {
      if (worker !== next || generation !== localGeneration) return;
      const message = event.data || {};
      if (message.type === 'progress') {
        if (loadState && loadState.onProgress) loadState.onProgress(message.value || 0);
        return;
      }
      if (message.type === 'ready') {
        if (message.model !== workerModel) {
          stopWorker('model_worker_mismatch');
          return;
        }
        workerReady = true;
        if (loadState) loadState.resolve(true);
        loadState = null;
        return;
      }
      if (message.type === 'load-error') {
        const error = runtimeError(message.error || 'model_load_failed');
        if (loadState) loadState.reject(error);
        loadState = null;
        stopWorker(error.code);
        return;
      }
      if (message.type === 'choice' || message.type === 'choice-error') {
        const request = pending.get(message.requestId);
        if (!request) return;
        pending.delete(message.requestId);
        clearTimeout(request.timer);
        if (message.type === 'choice-error') {
          request.reject(runtimeError(message.error || 'model_inference_failed'));
        } else {
          request.resolve(message);
        }
      }
    };
    next.onerror = event => stopWorker(event.message || 'model_worker_error');
    return next;
  }

  function ensureModel(strategy, onProgress) {
    if (!strategy || strategy.engine !== 'douzero') return Promise.resolve(false);
    ensureWorker(strategy.model, onProgress);
    if (workerReady) return Promise.resolve(true);
    if (loadState) {
      if (onProgress) loadState.onProgress = onProgress;
      return loadState.promise;
    }
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    loadState = { promise, resolve, reject, onProgress };
    worker.postMessage({ type: 'load', model: strategy.model, testFault: localTestFault() });
    return promise;
  }

  function selectDifficulty(difficulty, onProgress) {
    const strategy = POLICY.resolve('opponent', difficulty);
    if (strategy.engine !== 'douzero') {
      if (worker) stopWorker('model_not_selected');
      return Promise.resolve(false);
    }
    return ensureModel(strategy, onProgress);
  }

  async function choose(options) {
    const strategy = POLICY.resolve(options.context || 'opponent', options.difficulty);
    if (strategy.engine !== 'douzero') return { strategy, cards: undefined, durationMs: 0 };
    await ensureModel(strategy, options.onProgress);
    return new Promise((resolve, reject) => {
      const requestId = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(runtimeError('model_inference_timeout'));
        stopWorker('model_inference_timeout');
      }, REQUEST_TIMEOUT_MS);
      pending.set(requestId, { resolve, reject, timer });
      worker.postMessage({
        type: 'choose',
        requestId,
        model: strategy.model,
        gameEpoch: options.gameEpoch,
        turnRevision: options.turnRevision,
        seat: options.seat,
        hand: options.hand,
        prev: options.prev,
        state: options.state,
        testFault: localTestFault(),
      });
    }).then(message => ({ ...message, strategy }));
  }

  window.DDZAIWorker = Object.freeze({
    selectDifficulty,
    choose,
    cancel: () => stopWorker('model_cancelled'),
    inspect: () => ({
      model: workerModel,
      ready: workerReady,
      pending: pending.size,
      generation,
    }),
  });
}());
