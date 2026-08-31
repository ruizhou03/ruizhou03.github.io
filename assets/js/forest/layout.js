(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ForestLayout = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SPACE_VERSION = 2;
  const SPACE_ID = 'greenhouse-bed-v1';

  const SCENES = Object.freeze({
    forest: Object.freeze({
      id: SPACE_ID,
      assetWidth: 1672,
      assetHeight: 941,
      centerX: 0.5,
      yBack: 0.585,
      yFront: 0.785,
      depthPower: 1.12,
      halfWidth: [0.34, 0.28, -0.24],
      scaleBack: 0.5,
      scaleFront: 1.14,
      verticalScale: 0.32,
      soilCenterZ: 0.51,
      soilRadiusX: 0.94,
      soilRadiusZ: 0.47,
      uMargin: 0.1,
      vMargin: 0.1,
    }),
    focusDay: Object.freeze({
      id: 'focus-day-v1',
      assetWidth: 1672,
      assetHeight: 941,
      centerX: 0.5,
      yBack: 0.71,
      yFront: 0.81,
      depthPower: 1.08,
      halfWidth: [0.18, 0.08, -0.05],
      scaleBack: 0.72,
      scaleFront: 1,
      verticalScale: 0.34,
      uMargin: 0.08,
      vMargin: 0.08,
    }),
    focusNight: Object.freeze({
      id: 'focus-night-v1',
      assetWidth: 1672,
      assetHeight: 941,
      centerX: 0.5,
      yBack: 0.685,
      yFront: 0.775,
      depthPower: 1.08,
      halfWidth: [0.18, 0.08, -0.05],
      scaleBack: 0.72,
      scaleFront: 1,
      verticalScale: 0.34,
      uMargin: 0.08,
      vMargin: 0.08,
    }),
    homeDesktop: Object.freeze({
      id: 'home-desktop-v1',
      assetWidth: 1024,
      assetHeight: 720,
      centerX: 0.49,
      yBack: 0.75,
      yFront: 0.83,
      depthPower: 1.08,
      halfWidth: [0.2, 0.07, -0.04],
      scaleBack: 0.72,
      scaleFront: 1,
      verticalScale: 0.34,
      uMargin: 0.08,
      vMargin: 0.08,
    }),
    homeMobile: Object.freeze({
      id: 'home-mobile-v1',
      assetWidth: 1672,
      assetHeight: 941,
      centerX: 0.5,
      yBack: 0.71,
      yFront: 0.83,
      depthPower: 1.08,
      halfWidth: [0.2, 0.08, -0.05],
      scaleBack: 0.72,
      scaleFront: 1,
      verticalScale: 0.34,
      uMargin: 0.08,
      vMargin: 0.08,
    }),
  });

  const PLANTS = Object.freeze({
    oak: Object.freeze({ anchorX: 0.5, anchorY: 0.985, footprintX: 0.092, footprintZ: 0.03, canopy: 0.12, heightWorld: 1, baseScale: 1 }),
    sakura: Object.freeze({ anchorX: 0.5, anchorY: 0.985, footprintX: 0.086, footprintZ: 0.028, canopy: 0.115, heightWorld: 0.94, baseScale: 0.94 }),
    palm: Object.freeze({ anchorX: 0.5, anchorY: 0.985, footprintX: 0.08, footprintZ: 0.027, canopy: 0.11, heightWorld: 1.04, baseScale: 0.96 }),
    cactus: Object.freeze({ anchorX: 0.5, anchorY: 0.985, footprintX: 0.07, footprintZ: 0.024, canopy: 0.075, heightWorld: 0.72, baseScale: 0.78 }),
    pine: Object.freeze({ anchorX: 0.5, anchorY: 0.985, footprintX: 0.086, footprintZ: 0.029, canopy: 0.1, heightWorld: 1.02, baseScale: 0.94 }),
  });

  const MIGRATION_SLOTS = Object.freeze([
    [0.28, 0.2], [0.5, 0.18], [0.72, 0.22],
    [0.2, 0.43], [0.39, 0.47], [0.61, 0.45], [0.8, 0.49],
    [0.27, 0.68], [0.5, 0.64], [0.73, 0.7],
    [0.34, 0.84], [0.66, 0.83],
  ]);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function random01(seed) {
    let x = seed >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  }

  function halton(index, base) {
    let fraction = 1;
    let result = 0;
    let cursor = Math.max(1, Math.floor(index));
    while (cursor > 0) {
      fraction /= base;
      result += fraction * (cursor % base);
      cursor = Math.floor(cursor / base);
    }
    return result;
  }

  function normalizeScene(scene) {
    return typeof scene === 'string' ? (SCENES[scene] || SCENES.forest) : (scene || SCENES.forest);
  }

  function normalizeWorldPosition(position, seedSource) {
    const source = position && typeof position === 'object' ? position : {};
    const hasXYZ = Number.isFinite(Number(source.x)) && Number.isFinite(Number(source.z));
    const x = hasXYZ ? clamp(source.x, -1, 1) : clamp(source.u, 0, 1) * 2 - 1;
    const z = hasXYZ ? clamp(source.z, 0, 1) : clamp(source.v, 0, 1);
    const y = Number.isFinite(Number(source.y)) ? clamp(source.y, -0.25, 1) : 0;
    return {
      space: source.space || SPACE_ID,
      version: SPACE_VERSION,
      x,
      y,
      z,
      // u/v 仅为旧调用方与调试工具保留；持久模型以 x/y/z 为准。
      u: (x + 1) / 2,
      v: z,
      seed: Number.isFinite(Number(source.seed)) ? Number(source.seed) >>> 0 : hashString(seedSource),
    };
  }

  function isWorldPosition(position) {
    return !!position && (
      (Number.isFinite(Number(position.x)) && Number.isFinite(Number(position.z)))
      || (Number.isFinite(Number(position.u)) && Number.isFinite(Number(position.v)))
    );
  }

  function depth(scene, v) {
    const config = normalizeScene(scene);
    return Math.pow(clamp(v, 0, 1), config.depthPower || 1);
  }

  function halfWidthAt(scene, v) {
    const config = normalizeScene(scene);
    const d = depth(config, v);
    const coeff = config.halfWidth || [0.35, 0, 0];
    return Math.max(0.04, coeff[0] + coeff[1] * d + coeff[2] * d * d);
  }

  function projectToAsset(scene, position) {
    const config = normalizeScene(scene);
    const world = normalizeWorldPosition(position);
    const d = depth(config, world.z);
    const half = halfWidthAt(config, world.z);
    const groundY = lerp(config.yBack, config.yFront, d);
    return {
      x: config.centerX + world.x * half,
      y: groundY - world.y * (config.verticalScale || 0.32) * lerp(config.scaleBack, config.scaleFront, d),
      groundY,
      depth: d,
      scale: lerp(config.scaleBack, config.scaleFront, d),
      zIndex: Math.round(d * 100000) + (world.seed % 97),
    };
  }

  function coverTransform(scene, viewport) {
    const config = normalizeScene(scene);
    const width = Math.max(1, Number(viewport && viewport.width) || config.assetWidth);
    const height = Math.max(1, Number(viewport && viewport.height) || config.assetHeight);
    const scale = Math.max(width / config.assetWidth, height / config.assetHeight);
    const renderedWidth = config.assetWidth * scale;
    const renderedHeight = config.assetHeight * scale;
    return {
      width,
      height,
      scale,
      offsetX: (width - renderedWidth) / 2,
      offsetY: (height - renderedHeight) / 2,
      renderedWidth,
      renderedHeight,
    };
  }

  function projectToViewport(scene, position, viewport) {
    const config = normalizeScene(scene);
    const asset = projectToAsset(config, position);
    const cover = coverTransform(config, viewport);
    return Object.assign({}, asset, {
      x: cover.offsetX + asset.x * cover.renderedWidth,
      y: cover.offsetY + asset.y * cover.renderedHeight,
      cover,
    });
  }

  function inverseFromViewport(scene, screenPoint, viewport, seedSource) {
    const config = normalizeScene(scene);
    const cover = coverTransform(config, viewport);
    const xAsset = (Number(screenPoint.x) - cover.offsetX) / cover.renderedWidth;
    const yAsset = (Number(screenPoint.y) - cover.offsetY) / cover.renderedHeight;
    let low = 0;
    let high = 1;
    for (let i = 0; i < 28; i += 1) {
      const mid = (low + high) / 2;
      const y = projectToAsset(config, { u: 0.5, v: mid }).y;
      if (y < yAsset) low = mid; else high = mid;
    }
    const v = clamp((low + high) / 2, config.vMargin, 1 - config.vMargin);
    const half = halfWidthAt(config, v);
    const u = clamp(0.5 + (xAsset - config.centerX) / (2 * half), config.uMargin, 1 - config.uMargin);
    return normalizeWorldPosition({ x: u * 2 - 1, y: 0, z: v }, seedSource);
  }

  function plantMeta(type) {
    return PLANTS[type] || PLANTS.oak;
  }

  function tierScale(tier) {
    const level = clamp(Math.round(Number(tier) || 1), 1, 4);
    return [0, 0.56, 0.76, 1, 1.2][level];
  }

  function growthScale(progress) {
    const value = clamp(progress, 0, 1);
    const smooth = value * value * (3 - 2 * value);
    return 0.15 + smooth * 0.85;
  }

  function densityProfile(count) {
    const total = Math.max(0, Math.floor(Number(count) || 0));
    if (total <= 24) return { key: 'full', footprintScale: 1, assetBase: 180 };
    if (total <= 60) return { key: 'compact', footprintScale: 0.78, assetBase: 150 };
    if (total <= 120) return { key: 'overview', footprintScale: 0.46, assetBase: 104 };
    return { key: 'dense', footprintScale: 0.34, assetBase: 84 };
  }

  function footprint(type, tier, position, densityScale) {
    const meta = plantMeta(type);
    const world = normalizeWorldPosition(position);
    const scale = tierScale(tier) * clamp(densityScale == null ? 1 : densityScale, 0.35, 1);
    return {
      x: world.x,
      z: world.z,
      rx: meta.footprintX * scale,
      rz: meta.footprintZ * scale,
    };
  }

  function footprintsOverlap(a, b, padding) {
    const extra = Math.max(0, Number(padding) || 0);
    const rx = a.rx + b.rx + extra * 2;
    const rz = a.rz + b.rz + extra * 0.7;
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return (dx * dx) / (rx * rx) + (dz * dz) / (rz * rz) < 1;
  }

  function soilBoundary(position, type, tier, densityScale, scene) {
    const config = normalizeScene(scene || 'forest');
    const world = normalizeWorldPosition(position);
    const root = footprint(type, tier, world, densityScale);
    const radiusX = Math.max(0.05, Number(config.soilRadiusX || 1) - root.rx);
    const radiusZ = Math.max(0.05, Number(config.soilRadiusZ || 0.5) - root.rz);
    const centerZ = Number.isFinite(Number(config.soilCenterZ)) ? Number(config.soilCenterZ) : 0.5;
    const nx = world.x / radiusX;
    const nz = (world.z - centerZ) / radiusZ;
    const metric = nx * nx + nz * nz;
    return { legal: metric <= 1, metric, world, radiusX, radiusZ, centerZ };
  }

  function screenEnvelope(scene, tree, viewport) {
    const position = normalizeWorldPosition(tree.position3d || tree.position, tree.id);
    const projected = projectToViewport(scene, position, viewport);
    const meta = plantMeta(tree.type || tree.treeType);
    // assetBase 以 1154×580 的桌面田地为标定基准；相机缩放必须同时作用于树的像素体积。
    // 否则手机仅缩小背景、树仍保持桌面像素宽度，会从画框两侧“掉出去”。
    const cameraScale = clamp(Math.min(
      (Number(viewport && viewport.width) || 1154) / 1154,
      (Number(viewport && viewport.height) || 580) / 580
    ), 0.36, 1.25);
    const scale = projected.scale * meta.baseScale * tierScale(tree.tier || 1) * cameraScale;
    const width = (Number(tree.assetWidth) || 180) * scale;
    const height = (Number(tree.assetHeight) || width) * scale;
    return {
      id: tree.id,
      x: projected.x - width * meta.anchorX,
      y: projected.y - height * meta.anchorY,
      width,
      height,
      rootX: projected.x,
      rootY: projected.y,
      depth: projected.depth,
      zIndex: projected.zIndex,
      scale,
      cameraScale,
      worldHeight: meta.heightWorld * tierScale(tree.tier || 1),
    };
  }

  function overlapRatio(a, b) {
    const left = Math.max(a.x, b.x);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const top = Math.max(a.y, b.y);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    if (right <= left || bottom <= top) return 0;
    const intersection = (right - left) * (bottom - top);
    return intersection / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
  }

  function canopyConflict(candidateTree, occupied, options) {
    const config = options || {};
    const scene = normalizeScene(config.scene || 'forest');
    const viewport = config.viewport || { width: scene.assetWidth, height: scene.assetHeight };
    const candidate = screenEnvelope(scene, candidateTree, viewport);
    let maxOverlap = 0;
    let penalty = 0;
    let hard = false;
    for (const tree of occupied || []) {
      const other = tree._layoutEnvelope || screenEnvelope(scene, tree, viewport);
      const ratio = overlapRatio(candidate, other);
      if (ratio <= 0) continue;
      const depthGap = Math.abs(candidate.depth - other.depth);
      const allowed = depthGap >= 0.12 ? 0.55 : 0.34;
      maxOverlap = Math.max(maxOverlap, ratio);
      penalty += Math.max(0, ratio - allowed);
      if (ratio > Math.max(0.72, allowed + 0.24)) hard = true;
    }
    return { hard, maxOverlap, penalty, envelope: candidate };
  }

  function candidateAt(seed, attempt, scene) {
    const config = normalizeScene(scene);
    const index = 1 + ((seed + attempt * 17) % 4093);
    const u = lerp(config.uMargin, 1 - config.uMargin, halton(index, 2));
    const rawV = halton(index, 3);
    const v = lerp(config.vMargin, 1 - config.vMargin, rawV);
    return normalizeWorldPosition({ u, v, seed }, seed);
  }

  function rootClearance(candidate, occupied, type, tier, densityScale, scene) {
    const current = footprint(type, tier, candidate, densityScale);
    const boundary = soilBoundary(candidate, type, tier, densityScale, scene || 'forest');
    if (!boundary.legal) return { legal: false, clearance: -1, boundary };
    let min = Infinity;
    for (const tree of occupied) {
      const position = tree._layoutPosition || normalizeWorldPosition(tree.position3d || tree.position, tree.id);
      const other = tree._layoutFootprint || footprint(tree.type || tree.treeType, tree.tier || 1, position, tree.densityScale);
      if (footprintsOverlap(current, other, 0.008)) return { legal: false, clearance: -1, boundary };
      const dx = Math.abs(current.x - other.x) - current.rx - other.rx;
      const dz = Math.abs(current.z - other.z) - current.rz - other.rz;
      min = Math.min(min, Math.hypot(Math.max(0, dx), Math.max(0, dz)));
    }
    return { legal: true, clearance: Number.isFinite(min) ? min : 1, boundary };
  }

  function allocatePosition(tree, occupied, options) {
    const config = options || {};
    const scene = normalizeScene(config.scene || 'forest');
    const seed = hashString(tree.id || config.seed || 'tree');
    const viewport = config.viewport || { width: scene.assetWidth, height: scene.assetHeight };
    const preparedOccupied = (occupied || []).map((item) => {
      const position = normalizeWorldPosition(item.position3d || item.position, item.id);
      return Object.assign({}, item, {
        _layoutPosition: position,
        _layoutFootprint: footprint(item.type || item.treeType, item.tier || 1, position, item.densityScale),
        _layoutEnvelope: screenEnvelope(scene, Object.assign({}, item, { position3d: position }), viewport),
      });
    });
    let best = null;
    let legalCandidates = 0;
    for (let attempt = 0; attempt < (config.attempts || 320); attempt += 1) {
      const candidate = candidateAt(seed, attempt, scene);
      const root = rootClearance(candidate, preparedOccupied, tree.type || tree.treeType, tree.tier || 1, tree.densityScale, scene);
      if (!root.legal) continue;
      const canopy = canopyConflict(Object.assign({}, tree, { position3d: candidate }), preparedOccupied, config);
      if (canopy.hard) continue;
      const edge = Math.min(candidate.u, 1 - candidate.u, candidate.v, 1 - candidate.v);
      const balance = 1 - Math.abs(candidate.u - 0.5) * 0.8;
      const depthBalance = 1 - Math.abs(candidate.v - 0.5) * 0.45;
      const score = root.clearance * 2 + edge * 3 + balance * 1.5 + depthBalance - canopy.penalty * 3 + random01(seed + attempt) * 0.01;
      if (!best || score > best.score) best = { position: candidate, score };
      legalCandidates += 1;
      if (legalCandidates >= (config.validLimit || 36)) break;
    }
    return best ? best.position : candidateAt(seed, 0, scene);
  }

  function readLegacyCell(position, columns) {
    const source = position && typeof position === 'object' ? position : {};
    const cols = Math.max(1, Math.floor(Number(columns) || 12));
    const hasCell = Number.isFinite(Number(source.cell));
    const hasRow = Number.isFinite(Number(source.row));
    const hasColumn = Number.isFinite(Number(source.col)) || Number.isFinite(Number(source.column));
    if (!hasCell && !hasRow && !hasColumn) return null;
    const cell = hasCell
      ? Math.max(0, Math.floor(Number(source.cell)))
      : Math.max(0, Math.floor(Number(source.row) || 0)) * cols
        + Math.max(0, Math.floor(Number(source.col ?? source.column) || 0));
    return {
      row: Math.floor(cell / cols),
      column: cell % cols,
      offsetX: Number.isFinite(Number(source.offsetX)) ? Number(source.offsetX) : 0,
      offsetY: Number.isFinite(Number(source.offsetY)) ? Number(source.offsetY) : 0,
    };
  }

  function legacyPositionToWorld(position, columns, rowCount, scene, seedSource) {
    const config = normalizeScene(scene);
    const cols = Math.max(1, Math.floor(Number(columns) || 12));
    const rows = Math.max(1, Math.floor(Number(rowCount) || 1));
    const legacy = readLegacyCell(position, cols);
    if (!legacy) return null;
    const spanU = 1 - config.uMargin * 2;
    const spanV = 1 - config.vMargin * 2;
    // 旧 offset 是相对旧网格单元的像素微调；只保留方向和小幅度，避免旧设备宽度泄漏到新世界坐标。
    const du = clamp(legacy.offsetX / 112, -0.35, 0.35) * (spanU / cols);
    const dv = clamp(legacy.offsetY / 88, -0.35, 0.35) * (spanV / rows);
    return normalizeWorldPosition({
      u: config.uMargin + ((legacy.column + 0.5) / cols) * spanU + du,
      v: config.vMargin + ((legacy.row + 0.5) / rows) * spanV + dv,
    }, seedSource);
  }

  function migrateLegacyPositions(trees, columns, options) {
    const list = Array.isArray(trees) ? trees : [];
    const cols = Math.max(1, Math.floor(Number(columns) || 12));
    const legacyCells = list.map((tree) => isWorldPosition(tree && tree.position3d) ? null : readLegacyCell(tree && tree.position, cols));
    const maxLegacyRow = legacyCells.reduce((max, cell) => cell ? Math.max(max, cell.row) : max, -1);
    const rowCount = Math.max(1, maxLegacyRow + 1, Math.ceil(list.length / cols));
    const occupied = [];
    return list.map((tree, index) => {
      if (isWorldPosition(tree.position3d)) {
        const normalized = normalizeWorldPosition(tree.position3d, tree.id);
        const clearance = rootClearance(normalized, occupied, tree.type, tree.tier || 1, tree.densityScale, options && options.scene);
        const position3d = clearance.legal ? normalized : allocatePosition(tree, occupied, options);
        const reconciled = Object.assign({}, tree, { position3d });
        occupied.push(reconciled);
        return reconciled;
      }
      const slot = MIGRATION_SLOTS[index % MIGRATION_SLOTS.length];
      const cycle = Math.floor(index / MIGRATION_SLOTS.length);
      const provisional = legacyPositionToWorld(tree && tree.position, cols, rowCount, options && options.scene, tree && tree.id || index)
        || normalizeWorldPosition({
          u: clamp(slot[0] + (random01(hashString(tree && tree.id || index)) - 0.5) * 0.025, 0.06, 0.94),
          v: clamp(slot[1] + cycle * 0.025, 0.06, 0.94),
        }, tree && tree.id || index);
      const root = rootClearance(provisional, occupied, tree && tree.type, tree && tree.tier || 1, tree && tree.densityScale, options && options.scene);
      const position3d = root.legal ? provisional : allocatePosition(tree || { id: index }, occupied, options);
      const migrated = Object.assign({}, tree, { position3d });
      occupied.push(migrated);
      return migrated;
    });
  }

  function layoutTrees(trees, options) {
    const config = options || {};
    const scene = normalizeScene(config.scene || 'forest');
    const viewport = config.viewport || { width: scene.assetWidth, height: scene.assetHeight };
    return (Array.isArray(trees) ? trees : []).map((tree) => {
      const position = normalizeWorldPosition(tree.position3d || tree.position, tree.id);
      const screen = screenEnvelope(scene, Object.assign({}, tree, { position3d: position }), viewport);
      return Object.assign({}, screen, { tree, position });
    }).sort((a, b) => a.zIndex - b.zIndex || String(a.id).localeCompare(String(b.id)));
  }

  return Object.freeze({
    SPACE_VERSION,
    SPACE_ID,
    SCENES,
    PLANTS,
    normalizeWorldPosition,
    isWorldPosition,
    projectToAsset,
    coverTransform,
    projectToViewport,
    inverseFromViewport,
    plantMeta,
    tierScale,
    growthScale,
    densityProfile,
    footprint,
    footprintsOverlap,
    soilBoundary,
    screenEnvelope,
    overlapRatio,
    canopyConflict,
    candidateAt,
    rootClearance,
    allocatePosition,
    readLegacyCell,
    legacyPositionToWorld,
    migrateLegacyPositions,
    layoutTrees,
    hashString,
  });
});
