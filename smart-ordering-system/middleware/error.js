function errorMiddleware(err, req, res, next) {
  console.error(`[错误] ${new Date().toLocaleString()} ${req.method} ${req.url}`);
  console.error(err.stack || err.message);

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ code: 401, message: '认证失败' });
  }

  if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    return res.status(400).json({ code: 400, message: '请求数据格式错误' });
  }

  // multer文件大小超限
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ code: 400, message: '文件大小超出限制' });
  }

  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器内部错误'
  });
}

module.exports = { errorMiddleware };
