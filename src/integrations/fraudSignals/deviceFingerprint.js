const crypto = require('crypto');
const { randomInt } = require('crypto');

function simulateLatency() {
  return 20 + randomInt(40);
}

function riskFromHash(hash) {
  const bucket = parseInt(hash.slice(0, 8), 16) / 0xffffffff;
  const risk = 0.1 + bucket * 0.6;
  return {
    risk: Number(risk.toFixed(4)),
    isNewDevice: bucket > 0.75,
    confidence: Number((0.6 + bucket * 0.35).toFixed(3))
  };
}

async function fingerprintDevice(deviceId) {
  const latencyMs = simulateLatency();

  return new Promise((resolve) => {
    setTimeout(() => {
      if (!deviceId) {
        resolve({
          deviceId: null,
          risk: 0.2,
          isNewDevice: true,
          confidence: 0.2,
          latencyMs,
          source: 'device-fingerprint-stub'
        });
        return;
      }

      const hash = crypto.createHash('sha256').update(deviceId).digest('hex');
      const derived = riskFromHash(hash);

      resolve({
        deviceId,
        risk: derived.risk,
        isNewDevice: derived.isNewDevice,
        confidence: derived.confidence,
        latencyMs,
        source: 'device-fingerprint-stub'
      });
    }, latencyMs);
  });
}

module.exports = {
  fingerprintDevice
};
