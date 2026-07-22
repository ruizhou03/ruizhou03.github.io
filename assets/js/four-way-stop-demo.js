(function () {
  "use strict";

  var root = document.getElementById("fws-demo");
  if (!root) return;

  var stopCanvas = document.getElementById("fws-stop-canvas");
  var signalCanvas = document.getElementById("fws-signal-canvas");
  if (!stopCanvas || !signalCanvas || !stopCanvas.getContext) return;

  var stopCtx = stopCanvas.getContext("2d");
  var signalCtx = signalCanvas.getContext("2d");
  var lowButton = document.getElementById("fws-low");
  var highButton = document.getElementById("fws-high");
  var playButton = document.getElementById("fws-play");
  var resetButton = document.getElementById("fws-reset");
  var stopMetric = document.getElementById("fws-stop-metric");
  var signalMetric = document.getElementById("fws-signal-metric");

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var running = !reducedMotion;
  var demand = "high";
  var last = 0;
  var seed = 20260722;
  var approaches = ["N", "S", "E", "W"];

  function makeState() {
    return {
      queues: { N: [], S: [], E: [], W: [] },
      movers: [],
      passed: 0,
      serviceClock: 0,
      cycleClock: 0,
      nextSignalSlot: 0,
      phaseLabel: "",
      lastChoice: ""
    };
  }

  var stopState = makeState();
  var signalState = makeState();

  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  }

  function styles() {
    var style = getComputedStyle(root);
    return {
      ink: style.getPropertyValue("--color-ink").trim(),
      text: style.getPropertyValue("--color-text").trim(),
      muted: style.getPropertyValue("--color-muted").trim(),
      border: style.getPropertyValue("--color-border").trim(),
      background: style.getPropertyValue("--color-bg-warm").trim(),
      stop: style.getPropertyValue("--fws-stop").trim(),
      signal: style.getPropertyValue("--fws-signal").trim(),
      road: style.getPropertyValue("--fws-road").trim(),
      lane: style.getPropertyValue("--fws-lane").trim()
    };
  }

  function queueTotal(state) {
    return approaches.reduce(function (sum, key) {
      return sum + state.queues[key].length;
    }, 0);
  }

  function addArrivals(state, dt) {
    var totalRate = demand === "low" ? 0.34 : 1.35;
    approaches.forEach(function (key) {
      if (random() < totalRate * dt / 4) {
        state.queues[key].push({ wait: 0, id: random() });
      }
      state.queues[key].forEach(function (car) { car.wait += dt; });
    });
  }

  function release(state, key, color) {
    if (!state.queues[key].length) return false;
    state.queues[key].shift();
    state.movers.push({ approach: key, progress: 0, color: color });
    state.passed += 1;
    return true;
  }

  function oldestApproach(state) {
    var best = null;
    var bestWait = -1;
    approaches.forEach(function (key) {
      if (state.queues[key].length && state.queues[key][0].wait > bestWait) {
        best = key;
        bestWait = state.queues[key][0].wait;
      }
    });
    return best;
  }

  function stepStop(dt, palette) {
    addArrivals(stopState, dt);
    stopState.serviceClock -= dt;
    if (stopState.serviceClock <= 0 && queueTotal(stopState)) {
      var active = approaches.filter(function (key) { return stopState.queues[key].length; });
      var chosen = oldestApproach(stopState);
      var released = release(stopState, chosen, palette.stop);
      var opposite = { N: "S", S: "N", E: "W", W: "E" }[chosen];
      if (active.length <= 2 && random() < 0.45) release(stopState, opposite, palette.stop);
      stopState.lastChoice = released ? chosen + " 方向先走" : "等待车辆";
      stopState.serviceClock = active.length >= 3 ? 1.25 : 0.82;
    }
    moveCars(stopState, dt);
  }

  function signalPhase(clock) {
    var t = clock % 12;
    if (t < 5) return { road: "NS", greenAge: t, label: t < 1.15 ? "南北绿灯 · 队首起步" : "南北绿灯 · 连续放行" };
    if (t < 6) return { road: "clear", greenAge: 0, label: "黄灯 / 全红 · 清场" };
    if (t < 11) return { road: "EW", greenAge: t - 6, label: t - 6 < 1.15 ? "东西绿灯 · 队首起步" : "东西绿灯 · 连续放行" };
    return { road: "clear", greenAge: 0, label: "黄灯 / 全红 · 清场" };
  }

  function stepSignal(dt, palette) {
    addArrivals(signalState, dt);
    signalState.cycleClock = (signalState.cycleClock + dt) % 12;
    signalState.nextSignalSlot -= dt;
    var phase = signalPhase(signalState.cycleClock);
    signalState.phaseLabel = phase.label;
    if (phase.road === "clear") {
      signalState.nextSignalSlot = Math.min(signalState.nextSignalSlot, 0);
    } else if (phase.greenAge < 1.15) {
      signalState.nextSignalSlot = Math.max(signalState.nextSignalSlot, 1.15 - phase.greenAge);
    } else if (signalState.nextSignalSlot <= 0) {
      var keys = phase.road === "NS" ? ["N", "S"] : ["E", "W"];
      keys.forEach(function (key) { release(signalState, key, palette.signal); });
      signalState.nextSignalSlot = 0.52;
    }
    moveCars(signalState, dt);
  }

  function moveCars(state, dt) {
    state.movers.forEach(function (car) { car.progress += dt / 0.9; });
    state.movers = state.movers.filter(function (car) { return car.progress < 1; });
  }

  function carPoint(approach, distance, center) {
    if (approach === "N") return [center, 96 - distance];
    if (approach === "S") return [center, 164 + distance];
    if (approach === "E") return [center + 34 + distance, 130];
    return [center - 34 - distance, 130];
  }

  function moverPoint(car, center) {
    var p = car.progress;
    if (car.approach === "N") return [center, 96 + p * 68];
    if (car.approach === "S") return [center, 164 - p * 68];
    if (car.approach === "E") return [center + 34 - p * 68, 130];
    return [center - 34 + p * 68, 130];
  }

  function drawCar(ctx, x, y, approach, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.translate(x, y);
    if (approach === "N" || approach === "S") {
      ctx.fillRect(-4, -7, 8, 14);
    } else {
      ctx.fillRect(-7, -4, 14, 8);
    }
    ctx.restore();
  }

  function drawRoad(ctx, palette) {
    ctx.clearRect(0, 0, 360, 260);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, 360, 260);
    ctx.fillStyle = palette.road;
    ctx.fillRect(0, 108, 360, 44);
    ctx.fillRect(158, 0, 44, 260);
    ctx.strokeStyle = palette.lane;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.moveTo(0, 130); ctx.lineTo(360, 130); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(180, 0); ctx.lineTo(180, 260); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = palette.background;
    ctx.lineWidth = 3;
    ctx.strokeRect(158, 108, 44, 44);
  }

  function drawQueues(ctx, state, palette, accent) {
    approaches.forEach(function (key) {
      var visible = state.queues[key].slice(0, 7);
      visible.forEach(function (_car, index) {
        var point = carPoint(key, 13 + index * 16, 180);
        drawCar(ctx, point[0], point[1], key, accent, Math.max(0.38, 1 - index * 0.08));
      });
      if (state.queues[key].length > 7) {
        var point = carPoint(key, 128, 180);
        ctx.fillStyle = palette.text;
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("+" + (state.queues[key].length - 7), point[0], point[1] + 4);
      }
    });
    state.movers.forEach(function (car) {
      var point = moverPoint(car, 180);
      drawCar(ctx, point[0], point[1], car.approach, car.color, 1);
    });
  }

  function drawStop(palette) {
    drawRoad(stopCtx, palette);
    drawQueues(stopCtx, stopState, palette, palette.stop);
    stopCtx.fillStyle = palette.stop;
    stopCtx.beginPath();
    for (var i = 0; i < 8; i++) {
      var angle = Math.PI / 8 + i * Math.PI / 4;
      var x = 215 + Math.cos(angle) * 12;
      var y = 91 + Math.sin(angle) * 12;
      if (i === 0) stopCtx.moveTo(x, y); else stopCtx.lineTo(x, y);
    }
    stopCtx.closePath(); stopCtx.fill();
    stopCtx.fillStyle = palette.background;
    stopCtx.font = "bold 7px sans-serif";
    stopCtx.textAlign = "center";
    stopCtx.fillText("STOP", 215, 94);
    stopCtx.fillStyle = palette.text;
    stopCtx.font = "12px sans-serif";
    stopCtx.fillText(stopState.lastChoice || "按到达顺序逐轮判断", 180, 246);
  }

  function drawSignalLights(ctx, phase, palette) {
    var nsGreen = phase.road === "NS";
    var ewGreen = phase.road === "EW";
    var positions = [
      [151, 98, nsGreen], [209, 162, nsGreen],
      [209, 98, ewGreen], [151, 162, ewGreen]
    ];
    positions.forEach(function (item) {
      ctx.beginPath(); ctx.arc(item[0], item[1], 5.5, 0, Math.PI * 2);
      ctx.fillStyle = item[2] ? palette.signal : palette.stop;
      ctx.fill();
    });
  }

  function drawSignal(palette) {
    drawRoad(signalCtx, palette);
    drawQueues(signalCtx, signalState, palette, palette.signal);
    var phase = signalPhase(signalState.cycleClock);
    drawSignalLights(signalCtx, phase, palette);
    var barX = 42, barY = 224, barW = 276;
    signalCtx.fillStyle = palette.border; signalCtx.fillRect(barX, barY, barW, 8);
    signalCtx.fillStyle = palette.signal; signalCtx.fillRect(barX, barY, barW * 5 / 12, 8);
    signalCtx.fillStyle = palette.stop; signalCtx.fillRect(barX + barW * 5 / 12, barY, barW / 12, 8);
    signalCtx.fillStyle = palette.signal; signalCtx.fillRect(barX + barW * 6 / 12, barY, barW * 5 / 12, 8);
    signalCtx.fillStyle = palette.stop; signalCtx.fillRect(barX + barW * 11 / 12, barY, barW / 12, 8);
    signalCtx.fillStyle = palette.ink;
    var markerX = barX + (signalState.cycleClock / 12) * barW;
    signalCtx.beginPath(); signalCtx.moveTo(markerX, barY - 5); signalCtx.lineTo(markerX - 4, barY - 11); signalCtx.lineTo(markerX + 4, barY - 11); signalCtx.fill();
    signalCtx.fillStyle = palette.text;
    signalCtx.font = "12px sans-serif";
    signalCtx.textAlign = "center";
    signalCtx.fillText(signalState.phaseLabel || "按方向成批放行", 180, 250);
  }

  function updateMetrics() {
    stopMetric.textContent = "当前排队 " + queueTotal(stopState) + " 辆 · 已通过 " + stopState.passed + " 辆";
    signalMetric.textContent = "当前排队 " + queueTotal(signalState) + " 辆 · 已通过 " + signalState.passed + " 辆";
  }

  function reset() {
    seed = 20260722;
    stopState = makeState();
    signalState = makeState();
    signalState.cycleClock = 4.2;
    stopState.lastChoice = "按到达顺序逐轮判断";
    var palette = styles();
    drawStop(palette); drawSignal(palette); updateMetrics();
  }

  function setDemand(value) {
    demand = value;
    lowButton.setAttribute("aria-pressed", String(value === "low"));
    highButton.setAttribute("aria-pressed", String(value === "high"));
    reset();
  }

  function frame(time) {
    var palette = styles();
    var dt = last ? Math.min(0.05, (time - last) / 1000) : 0;
    last = time;
    if (running && dt > 0) {
      stepStop(dt, palette);
      stepSignal(dt, palette);
    }
    drawStop(palette);
    drawSignal(palette);
    updateMetrics();
    requestAnimationFrame(frame);
  }

  lowButton.addEventListener("click", function () { setDemand("low"); });
  highButton.addEventListener("click", function () { setDemand("high"); });
  playButton.addEventListener("click", function () {
    running = !running;
    playButton.textContent = running ? "暂停" : "播放";
    playButton.setAttribute("aria-pressed", String(!running));
  });
  resetButton.addEventListener("click", reset);

  playButton.textContent = running ? "暂停" : "播放";
  highButton.setAttribute("aria-pressed", "true");
  lowButton.setAttribute("aria-pressed", "false");
  reset();
  requestAnimationFrame(frame);
})();
