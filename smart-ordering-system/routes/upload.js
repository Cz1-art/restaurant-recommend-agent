const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 配置multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG、GIF、WEBP 格式的图片'));
    }
  }
});

// 上传图片（管理员）
router.post('/', authMiddleware, adminMiddleware, upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ code: 400, message: '请选择图片' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ code: 0, message: '上传成功', data: { url } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
