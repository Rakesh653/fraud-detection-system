const express = require('express');
const { handlePaymentWebhook } = require('../controllers/paymentGatewayController');

const router = express.Router();

router.post('/webhooks/payment', handlePaymentWebhook);

module.exports = router;
