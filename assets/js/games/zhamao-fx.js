/* 百变小咪 · 动画引擎（window.ZhamaoFx）
 * 引擎本体在 games-fx.js（和拱猪共用，2026-11-22 抽出来）；这里只是薄壳：把百变小咪原来的默认值传进去——
 * 类名前缀 zm-（样式在 zhamao.css）、牌高 = 1.4 × 牌宽、粒子形状表、手感参数都和抽出来之前一模一样。
 * 用法照旧：ZhamaoFx.create(layer, { sound, speed })，fx.fly / burst / smoke / ring / flash / shake / pop / float / arrow，ZhamaoFx.SHAPES。
 * 页面要先加载 games-fx.js。 */
(function () {
  'use strict';
  const G = window.GamesFx;
  window.ZhamaoFx = {
    create: (layer, opts) => G.create(layer, Object.assign({ prefix: 'zm', cardRatio: 1.4, shapes: G.SHAPES }, opts)),
    SHAPES: G.SHAPES,
  };
})();
