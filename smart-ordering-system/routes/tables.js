const express = require('express');
const router = express.Router();
const Table = require('../models/table');
const { authMiddleware, staffMiddleware } = require('../middleware/auth');

// 获取所有餐桌（员工）
router.get('/', authMiddleware, staffMiddleware, (req, res) => {
  res.json({ code: 0, data: Table.findAll() });
});

// 获取空闲餐桌
router.get('/free', async (req, res) => {
  res.json({ code: 0, data: Table.getFree() });
});

// 添加餐桌（管理员）
router.post('/', authMiddleware, staffMiddleware, (req, res) => {
  const { table_no, capacity } = req.body;
  if (!table_no) return res.status(400).json({ code: 400, message: '请输入桌号' });
  const table = Table.create({ table_no, capacity: parseInt(capacity) || 4 });
  res.json({ code: 0, message: '添加成功', data: table });
});

// 更新餐桌
router.put('/:id', authMiddleware, staffMiddleware, (req, res) => {
  const table = Table.update(req.params.id, req.body);
  if (!table) return res.status(404).json({ code: 404, message: '餐桌不存在' });
  res.json({ code: 0, message: '更新成功', data: table });
});

// 删除餐桌
router.delete('/:id', authMiddleware, staffMiddleware, (req, res) => {
  if (!Table.delete(req.params.id)) return res.status(404).json({ code: 404, message: '餐桌不存在' });
  res.json({ code: 0, message: '删除成功' });
});

module.exports = router;
