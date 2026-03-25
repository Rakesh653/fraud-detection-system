const config = require('../config');

function gatewayAuth(req, res, next) {
  const requiredKey = config.gateway.apiKey;

  if (req.path.startsWith('/webhooks/payment')) {
    return next();
  }

  if (!requiredKey) {
    return next();
  }

  const providedKey = req.header('x-api-key');

  if (!providedKey || providedKey !== requiredKey) {
    return res.status(401).json({
      error: 'Unauthorized: invalid API key.'
    });
  }

  return next();
}

module.exports = {
  gatewayAuth
};
