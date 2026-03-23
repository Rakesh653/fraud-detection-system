const crypto = require('crypto');

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

module.exports = { hashPayload };
