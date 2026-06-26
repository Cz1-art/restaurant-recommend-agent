const express = require('express');
const router = express.Router();
const Payment = require('../models/payment');
const { authMiddleware, staffMiddleware } = require('../middleware/auth');

// 获取我的支付记录
router.get('/mine', authMiddleware, (req, res) => {
  res.json({ code: 0, data: Payment.findByUser(req.user.id) });
});

// 获取订单支付记录
router.get('/order/:orderId', authMiddleware, (req, res) => {
  res.json({ code: 0, data: Payment.findByOrder(req.params.orderId) });
});

// 所有支付记录（员工）
router.get('/', authMiddleware, staffMiddleware, (req, res) => {
  res.json({ code: 0, data: Payment.findAll({ page: parseInt(req.query.page) || 1 }) });
});

// 支付统计（员工）
router.get('/stats', authMiddleware, staffMiddleware, (req, res) => {
  res.json({ code: 0, data: Payment.getStats() });
});

module.exports = router;
