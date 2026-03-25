const { randomInt } = require('crypto');

function determineNetwork(bin) {
  if (bin.startsWith('4')) return 'VISA';
  if (bin.startsWith('5')) return 'MASTERCARD';
  if (bin.startsWith('3')) return 'AMEX';
  if (bin.startsWith('6')) return 'RuPay';
  return 'UNKNOWN';
}

function baseRisk(bin) {
  if (!bin) return 0.05;
  if (bin.startsWith('999')) return 0.85;
  if (bin.startsWith('000')) return 0.75;
  if (bin.startsWith('4')) return 0.15;
  if (bin.startsWith('5')) return 0.2;
  return 0.3;
}

function simulateLatency() {
  return 20 + randomInt(30);
}

async function lookupBin(cardBin) {
  const cleanBin = String(cardBin || '').replace(/\D/g, '').slice(0, 6);
  const latencyMs = simulateLatency();

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        bin: cleanBin || null,
        network: determineNetwork(cleanBin || ''),
        issuerCountry: cleanBin ? 'IN' : 'UNKNOWN',
        risk: Number(baseRisk(cleanBin).toFixed(4)),
        latencyMs,
        source: 'bin-db-stub'
      });
    }, latencyMs);
  });
}

module.exports = {
  lookupBin
};
