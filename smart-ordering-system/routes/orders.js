const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Payment = require('../models/payment');
const { authMiddleware, adminMiddleware, staffMiddleware } = require('../middleware/auth');

// 创建订单（需登录）
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.create(req.user.id, req.body);
    res.json({ code: 0, message: '下单成功', data: order });
  } catch (err) {
    if (err.message === '购物车为空') {
      return res.status(400).json({ code: 400, message: err.message });
    }
    next(err);
  }
});

// 获取我的订单（需登录）
router.get('/my', authMiddleware, async (req, res, next) => {
  try {
    const { status, page, pageSize } = req.query;
    const result = await Order.findAll({
      userId: req.user.id,
      status,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20
    });
    res.json({ code: 0, message: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

// 获取所有订单（管理员/餐厅员工）
router.get('/', authMiddleware, staffMiddleware, async (req, res, next) => {
  try {
    const { status, page, pageSize } = req.query;
    const result = await Order.findAll({
      status,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20
    });
    res.json({ code: 0, message: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

// 获取订单详情
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });
    // 非管理员/员工只能查看自己的订单
    if (!['admin', 'staff'].includes(req.user.role) && order.user_id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权查看此订单' });
    }
    res.json({ code: 0, message: 'success', data: order });
  } catch (err) {
    next(err);
  }
});

// 支付订单（用户）
router.put('/:id/pay', authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权支付此订单' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ code: 400, message: '当前订单状态不可支付' });
    }
    const updated = await Order.updateStatus(req.params.id, 'paid');
    // 记录支付流水
    Payment.create(req.params.id, req.user.id, order.total_price, '模拟支付');
    res.json({ code: 0, message: '支付成功', data: updated });
  } catch (err) {
    next(err);
  }
});

// 取消订单（用户）
router.put('/:id/cancel', authMiddleware, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权取消此订单' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ code: 400, message: '只能取消待支付的订单' });
    }
    const updated = await Order.updateStatus(req.params.id, 'cancelled');
    res.json({ code: 0, message: '订单已取消', data: updated });
  } catch (err) {
    next(err);
  }
});

// 更新订单状态（管理员/餐厅员工）
router.put('/:id/status', authMiddleware, staffMiddleware, async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.updateStatus(req.params.id, status);
    if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });
    res.json({ code: 0, message: '状态更新成功', data: order });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
