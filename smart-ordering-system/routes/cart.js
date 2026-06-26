const express = require('express');
const router = express.Router();
const Cart = require('../models/cart');
const { authMiddleware } = require('../middleware/auth');

// 所有购物车操作都需要登录
router.use(authMiddleware);

// 获取购物车
router.get('/', async (req, res, next) => {
  try {
    const items = await Cart.findByUserId(req.user.id);
    // 计算总价和总数
    let totalPrice = 0;
    let totalCount = 0;
    items.forEach(item => {
      totalPrice += item.price * item.quantity;
      totalCount += item.quantity;
    });
    res.json({
      code: 0,
      message: 'success',
      data: {
        items,
        totalPrice: Math.round(totalPrice * 100) / 100,
        totalCount
      }
    });
  } catch (err) {
    next(err);
  }
});

// 添加到购物车
router.post('/', async (req, res, next) => {
  try {
    const { dish_id, quantity } = req.body;
    if (!dish_id) return res.status(400).json({ code: 400, message: '请指定菜品' });
    console.log('[CART] addItem user_id:', req.user.id, 'dish_id:', dish_id, 'type:', typeof dish_id);
    await Cart.addItem(req.user.id, Number(dish_id), quantity || 1);
    const count = await Cart.getItemCount(req.user.id);
    res.json({ code: 0, message: '已加入购物车', data: { cartCount: count } });
  } catch (err) {
    next(err);
  }
});

// 更新购物车项数量
router.put('/:dishId', async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined) return res.status(400).json({ code: 400, message: '请指定数量' });
    const updated = await Cart.updateQuantity(req.user.id, req.params.dishId, quantity);
    res.json({ code: 0, message: updated ? '更新成功' : '商品已移除' });
  } catch (err) {
    next(err);
  }
});

// 删除购物车项
router.delete('/:dishId', async (req, res, next) => {
  try {
    await Cart.removeItem(req.user.id, req.params.dishId);
    res.json({ code: 0, message: '已移除' });
  } catch (err) {
    next(err);
  }
});

// 清空购物车
router.delete('/', async (req, res, next) => {
  try {
    await Cart.clear(req.user.id);
    res.json({ code: 0, message: '购物车已清空' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
