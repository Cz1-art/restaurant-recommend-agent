const express = require('express');
const router = express.Router();
const Dish = require('../models/dish');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 获取菜品列表（公开，支持筛选）
router.get('/', async (req, res, next) => {
  try {
    const { categoryId, status, keyword } = req.query;
    const dishes = await Dish.findAll({ categoryId, status, keyword });
    res.json({ code: 0, message: 'success', data: dishes });
  } catch (err) {
    next(err);
  }
});

// 智能推荐
router.get('/recommend', async (req, res, next) => {
  try {
    const data = Dish.getRecommendations();
    res.json({ code: 0, message: 'success', data });
  } catch (err) {
    next(err);
  }
});

// 猜你喜欢（需登录）
router.get('/recommend/guess', authMiddleware, async (req, res, next) => {
  try {
    const dishes = Dish.getGuessYouLike(req.user.id);
    res.json({ code: 0, message: 'success', data: dishes });
  } catch (err) {
    next(err);
  }
});

// 根据用户评价智能推荐（需登录）
router.get('/recommend/review', authMiddleware, async (req, res, next) => {
  try {
    const dishes = Dish.getRecommendByReviews(req.user.id);
    res.json({ code: 0, message: 'success', data: dishes });
  } catch (err) {
    next(err);
  }
});

// 获取单个菜品
router.get('/:id', async (req, res, next) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return res.status(404).json({ code: 404, message: '菜品不存在' });
    res.json({ code: 0, message: 'success', data: dish });
  } catch (err) {
    next(err);
  }
});

// 添加菜品（管理员）
router.post('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { name, price, category_id, image, description, ingredients, flavor } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ code: 400, message: '菜品名称不能为空' });
    if (!price || parseFloat(price) <= 0) return res.status(400).json({ code: 400, message: '请输入有效价格' });
    if (!category_id) return res.status(400).json({ code: 400, message: '请选择分类' });

    const dish = await Dish.create({
      name: name.trim(),
      price: parseFloat(price),
      category_id,
      image,
      description,
      ingredients,
      flavor: flavor || ''
    });
    res.json({ code: 0, message: '添加成功', data: dish });
  } catch (err) {
    next(err);
  }
});

// 更新菜品（管理员）
router.put('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    if (req.body.price !== undefined) req.body.price = parseFloat(req.body.price);
    const dish = await Dish.update(req.params.id, req.body);
    if (!dish) return res.status(404).json({ code: 404, message: '菜品不存在' });
    res.json({ code: 0, message: '更新成功', data: dish });
  } catch (err) {
    next(err);
  }
});

// 删除菜品（管理员）
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const deleted = await Dish.delete(req.params.id);
    if (!deleted) return res.status(404).json({ code: 404, message: '菜品不存在' });
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
