const express = require('express');
const router = express.Router();
const Favorite = require('../models/favorite');
const { authMiddleware, staffMiddleware } = require('../middleware/auth');

// 获取我的收藏
router.get('/', authMiddleware, (req, res) => {
  res.json({ code: 0, data: Favorite.findByUser(req.user.id) });
});

// 添加收藏
router.post('/:dishId', authMiddleware, (req, res) => {
  const fav = Favorite.add(req.user.id, req.params.dishId);
  res.json({ code: 0, message: '已收藏', data: fav });
});

// 取消收藏
router.delete('/:dishId', authMiddleware, (req, res) => {
  Favorite.remove(req.user.id, req.params.dishId);
  res.json({ code: 0, message: '已取消收藏' });
});

// 检查是否已收藏
router.get('/check/:dishId', authMiddleware, (req, res) => {
  res.json({ code: 0, data: { isFavorited: Favorite.isFavorited(req.user.id, req.params.dishId) } });
});

// 收藏统计（员工）
router.get('/stats/popular', authMiddleware, staffMiddleware, (req, res) => {
  res.json({ code: 0, data: Favorite.getGroupedStats() });
});

module.exports = router;
