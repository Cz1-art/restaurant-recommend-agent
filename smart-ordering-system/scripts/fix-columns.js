require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../models/db');

console.log('添加缺失字段...');

const orderCols = db.prepare("PRAGMA table_info(orders)").all().map(r => r.name);

if (!orderCols.includes('table_id')) {
  db.exec('ALTER TABLE orders ADD COLUMN table_id INTEGER DEFAULT NULL;');
  console.log('  ✅ orders 添加 table_id');
}
if (!orderCols.includes('paid_at')) {
  db.exec("ALTER TABLE orders ADD COLUMN paid_at DATETIME DEFAULT NULL;");
  console.log('  ✅ orders 添加 paid_at');
}

console.log('完成！');
process.exit(0);
