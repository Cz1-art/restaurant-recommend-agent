const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 获取统计信息（管理员）
router.get('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const stats = await Order.getStats();
    res.json({ code: 0, message: 'success', data: stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
