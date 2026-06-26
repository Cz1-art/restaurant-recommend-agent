const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 获取所有分类（公开）
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.findAll();
    res.json({ code: 0, message: 'success', data: categories });
  } catch (err) {
    next(err);
  }
});

// 获取单个分类
router.get('/:id', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ code: 404, message: '分类不存在' });
    res.json({ code: 0, message: 'success', data: category });
  } catch (err) {
    next(err);
  }
});

// 添加分类（管理员）
router.post('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { name, sort } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ code: 400, message: '分类名称不能为空' });
    const category = await Category.create({ name: name.trim(), sort });
    res.json({ code: 0, message: '添加成功', data: category });
  } catch (err) {
    next(err);
  }
});

// 更新分类（管理员）
router.put('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const category = await Category.update(req.params.id, req.body);
    if (!category) return res.status(404).json({ code: 404, message: '分类不存在' });
    res.json({ code: 0, message: '更新成功', data: category });
  } catch (err) {
    next(err);
  }
});

// 删除分类（管理员）
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id;
    const hasDishes = await Category.hasDishes(id);
    if (hasDishes) return res.status(400).json({ code: 400, message: '该分类下有菜品，无法删除' });
    const deleted = await Category.delete(id);
    if (!deleted) return res.status(404).json({ code: 404, message: '分类不存在' });
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
