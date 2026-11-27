(() => {
  'use strict';

  const contract = {
    releaseMarker: '20261127ui28',
    build: '2026.08.01.phase7-j',
    // 本机调试（localhost / 127.0.0.1 打开页面）连本机内存服务器（zircon-urge: node scripts/guandan-local-server.mjs），照百变小咪
    apiUrl: (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]gdprod=1\b/.test(location.search))
      ? 'http://127.0.0.1:8790/api/guandan'
      : 'https://zircon-urge.fly.dev/api/guandan',
    rulesVersion: 'gd-huaian-2025-site-v1',
    protocolVersion: 'guandan-protocol-v2',
    saveSchemaVersion: 3,
    roomSchemaVersion: 3,
    onlineSessionSchemaVersion: 2,
    aiContractVersion: 'gd-ai-contract-v1',
    storageKeys: Object.freeze({
      preferences: 'tool.guandan.v1',
      localSession: 'tool.guandan.session.v1',
      onlineSession: 'tool.guandan.online.session.v1',
      muted: 'tool.guandan.muted',
      audio: 'tool.guandan.audio.v1',
      hardOffline: 'tool.guandan.hardOffline.v1',
    }),
  };

  window.GuandanContract = Object.freeze({
    ...contract,
    storageKeys: contract.storageKeys,
  });
})();
