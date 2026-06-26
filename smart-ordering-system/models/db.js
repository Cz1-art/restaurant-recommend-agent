require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './data/smart_ordering.db';
const dir = path.dirname(dbPath);

// 确保数据目录存在
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

// 开启WAL模式提升并发性能
db.pragma('journal_mode = WAL');
// 开启外键约束
db.pragma('foreign_keys = ON');

module.exports = db;
