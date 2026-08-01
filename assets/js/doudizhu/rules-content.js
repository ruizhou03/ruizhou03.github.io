(function () {
  'use strict';
  const RULES = Object.freeze({
    version: 'ddz-rules-cn-2026-08-v1',
    sections: Object.freeze([
      '3 人使用一副 54 张牌（含大小王）。叫分最高者成为地主，另外两名农民合作对抗；地主先出完牌则地主胜，任一农民先出完则农民胜。',
      '牌型包括单张、对子、三条、三带一、三带二、顺子（至少 5 张）、连对（至少 3 对）、飞机（至少 2 个连续三条，可带等量单张或对子）、炸弹和火箭。除炸弹、火箭外，只能用张数相同且同类型的更大牌压制。',
      '底分来自叫分；炸弹、火箭和春天会增加结算倍数。结算框只显示每名玩家本盘净分，累计排名在独立区域展示。房主可在开局前配置是否允许四带二、总盘数和单盘封顶。',
    ]),
  });

  function renderRules(container) {
    if (!container) return;
    container.replaceChildren(...RULES.sections.map((text) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    }));
    container.dataset.rulesVersion = RULES.version;
  }

  window.DDZRules = Object.freeze({ config: RULES, render: renderRules });
  renderRules(document.getElementById('ddzRulesContent'));
})();
