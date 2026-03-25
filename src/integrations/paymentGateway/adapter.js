function normalizeWebhookPayload(payload) {
  const status = String(payload?.status || payload?.eventType || 'AUTHORIZED').toUpperCase();

  const normalized = {
    userId: payload?.userId || payload?.customerId || null,
    amount: Number(payload?.amount),
    deviceId: payload?.deviceId || payload?.deviceFingerprint || null,
    cardBin: payload?.cardBin || payload?.bin || null,
    ipAddress: payload?.ipAddress || payload?.ip || null,
    gatewayEventId: payload?.eventId || payload?.id || null,
    provider: payload?.provider || 'mock-payments',
    status
  };

  const missing = [];
  if (!normalized.userId) missing.push('userId');
  if (!normalized.deviceId) missing.push('deviceId');
  if (!Number.isFinite(normalized.amount)) missing.push('amount');

  return {
    normalized,
    missing,
    shouldProcess: ['AUTHORIZED', 'CAPTURED', 'CHARGE.SUCCEEDED'].includes(status)
  };
}

module.exports = {
  normalizeWebhookPayload
};
