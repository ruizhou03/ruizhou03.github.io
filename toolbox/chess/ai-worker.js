/* toolbox/chess/ai-worker.js
 * 国际象棋 AI 的 Web Worker 外壳。
 * 主线程发 { id, fen, history, cfg } 进来，回 { id, move } 出去。
 * 把 negamax 搬到 worker 后，hard 难度搜索期间主线程不再卡 UI。
 *
 * 注意：history 数组是为了让 ChessAI 的开局库匹配 SAN 序列；只发 FEN 的话，
 * worker 端 game.history() 永远是空的，book 永远命中不了。
 */
self.importScripts('/assets/lib/chess.min.js', '/assets/js/games-shell/chess-ai.js');

self.onmessage = function (e) {
  const { id, fen, history, cfg } = e.data || {};
  try {
    const game = new Chess();
    if (fen) {
      const ok = game.load(fen);
      if (!ok) {
        self.postMessage({ id, error: 'invalid_fen' });
        return;
      }
    }
    // Replay history from start so ChessAI.pickFromBook can see SAN sequence.
    // 但加载 FEN 后 history 是空的；如果主线程给了完整 history，就用 game.load_pgn 重建。
    // 简化：如果传 history 数组，用 reset + 逐手 move 重建，保证 game.history() 准确。
    if (Array.isArray(history) && history.length) {
      game.reset();
      for (const san of history) {
        if (!game.move(san)) {
          // 重建失败，退回 FEN 模式（book 拿不到，但主搜索仍然能跑）
          if (fen) game.load(fen);
          break;
        }
      }
    }
    const move = self.ChessAI.pickAiMove(game, cfg || {});
    self.postMessage({ id, move });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
