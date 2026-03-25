const crypto = require('crypto');
const config = require('../../config');

function verifyWebhookSignature(req) {
  const secret = config.gateway.webhookSecret;

  if (!secret) {
    return { valid: true, reason: 'No webhook secret configured' };
  }

  const signature = req.header('x-gateway-signature');
  if (!signature) {
    return { valid: false, reason: 'Missing x-gateway-signature header' };
  }

  // NOTE: This is a stub. Real integrations should use the raw request body.
  const payload = JSON.stringify(req.body || {});
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return {
    valid: signature === expected,
    reason: signature === expected ? 'Signature verified' : 'Signature mismatch'
  };
}

module.exports = {
  verifyWebhookSignature
};
