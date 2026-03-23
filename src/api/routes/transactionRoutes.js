const express = require('express');
const { createTransaction } = require('../controllers/transactionController');

const router = express.Router();

router.post('/transaction', createTransaction);

module.exports = router;
