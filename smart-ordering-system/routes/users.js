const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 用户注册
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, nickname, phone } = req.body;
    if (!username || !username.trim()) return res.status(400).json({ code: 400, message: '用户名不能为空' });
    if (!password || password.length < 6) return res.status(400).json({ code: 400, message: '密码不能少于6位' });

    const existing = await User.findByUsername(username.trim());
    if (existing) return res.status(400).json({ code: 400, message: '用户名已存在' });

    const user = await User.create({
      username: username.trim(),
      password,
      nickname: nickname || username.trim(),
      phone: phone || '',
      role: 'customer'
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ code: 0, message: '注册成功', data: { token, user } });
  } catch (err) {
    next(err);
  }
});

// 用户登录
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });

    const user = await User.validatePassword(username, password);
    if (!user) return res.status(400).json({ code: 400, message: '用户名或密码错误' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const userInfo = await User.findById(user.id);
    res.json({ code: 0, message: '登录成功', data: { token, user: userInfo } });
  } catch (err) {
    next(err);
  }
});

// 获取当前用户信息
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 404, message: '用户不存在' });
    res.json({ code: 0, message: 'success', data: user });
  } catch (err) {
    next(err);
  }
});

// 更新当前用户信息
router.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.update(req.user.id, req.body);
    res.json({ code: 0, message: '更新成功', data: user });
  } catch (err) {
    next(err);
  }
});

// 创建用户（管理员）
router.post('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { username, password, nickname, phone, role } = req.body;
    if (!username || !username.trim()) return res.status(400).json({ code: 400, message: '用户名不能为空' });
    if (!password || password.length < 6) return res.status(400).json({ code: 400, message: '密码不能少于6位' });
    const existing = await User.findByUsername(username.trim());
    if (existing) return res.status(400).json({ code: 400, message: '用户名已存在' });
    const user = await User.create({ username: username.trim(), password, nickname: nickname || username.trim(), phone: phone || '', role: role || 'customer' });
    res.json({ code: 0, message: '创建成功', data: user });
  } catch (err) { next(err); }
});

// 获取用户列表（管理员）
router.get('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { role, page, pageSize } = req.query;
    const result = await User.findAll({ role, page: parseInt(page) || 1, pageSize: parseInt(pageSize) || 20 });
    res.json({ code: 0, message: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

// 更新用户（管理员）
router.put('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const user = await User.update(req.params.id, req.body);
    if (!user) return res.status(404).json({ code: 404, message: '用户不存在' });
    res.json({ code: 0, message: '更新成功', data: user });
  } catch (err) {
    next(err);
  }
});

// 删除用户（管理员）
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    if (!User.adminDelete(req.params.id)) return res.status(404).json({ code: 404, message: '用户不存在' });
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
