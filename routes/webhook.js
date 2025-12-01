const express = require("express");
const router = express.Router();
const { PaymentController } = require("../controllers");

// Обработка успешного платежа
router.post("/payments/webhook", PaymentController.webhook);

module.exports = router;
