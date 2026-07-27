(() => {
  'use strict';

  const contract = {
    releaseMarker: '20260727p7a',
    build: '2026.07.27.phase7-a',
    apiUrl: 'https://zircon-urge.fly.dev/api/guandan',
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
      hardOffline: 'tool.guandan.hardOffline.v1',
    }),
  };

  window.GuandanContract = Object.freeze({
    ...contract,
    storageKeys: contract.storageKeys,
  });
})();
