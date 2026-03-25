const net = require('net');
const { randomInt } = require('crypto');

function simulateLatency() {
  return 15 + randomInt(25);
}

function isPrivateIPv4(ip) {
  return /^10\./.test(ip)
    || /^192\.168\./.test(ip)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

function calculateRisk(ip) {
  if (!ip) return { risk: 0.1, reputation: 'unknown' };
  if (isPrivateIPv4(ip)) return { risk: 0.15, reputation: 'private' };
  if (ip.startsWith('203.0.113')) return { risk: 0.7, reputation: 'test-net' };
  if (ip.endsWith('.0') || ip.endsWith('.255')) return { risk: 0.5, reputation: 'suspicious' };
  return { risk: 0.25, reputation: 'neutral' };
}

async function checkIpReputation(ipAddress) {
  const latencyMs = simulateLatency();

  return new Promise((resolve) => {
    setTimeout(() => {
      const ip = ipAddress && net.isIP(ipAddress) ? ipAddress : null;
      const result = calculateRisk(ip || null);

      resolve({
        ipAddress: ip || null,
        risk: Number(result.risk.toFixed(4)),
        reputation: result.reputation,
        latencyMs,
        source: 'ip-reputation-stub'
      });
    }, latencyMs);
  });
}

module.exports = {
  checkIpReputation
};
