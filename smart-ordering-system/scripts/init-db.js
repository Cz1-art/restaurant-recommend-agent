require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './data/smart_ordering.db';
const dir = path.dirname(dbPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('开始初始化数据库...');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    nickname TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    role TEXT DEFAULT 'customer' CHECK(role IN ('admin', 'customer', 'staff')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    category_id INTEGER NOT NULL,
    image TEXT DEFAULT '/images/default-dish.png',
    description TEXT DEFAULT '',
    ingredients TEXT DEFAULT '',
    flavor TEXT DEFAULT '',
    status TEXT DEFAULT 'on' CHECK(status IN ('on', 'off')),
    sales INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    dish_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, dish_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    total_price REAL NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'cooking', 'done', 'cancelled')),
    remark TEXT DEFAULT '',
    table_no TEXT DEFAULT '',
    table_id INTEGER DEFAULT NULL,
    paid_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    dish_id INTEGER NOT NULL,
    dish_name TEXT NOT NULL,
    dish_price REAL NOT NULL,
    dish_image TEXT DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    dish_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, dish_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    dish_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    content TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_no TEXT NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 4,
    status TEXT DEFAULT 'free' CHECK(status IN ('free', 'occupied', 'reserved')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT DEFAULT '模拟支付',
    status TEXT DEFAULT 'success',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

console.log('✓ 数据表创建成功');

// 插入初始数据（使用事务）
const insertData = db.transaction(() => {
  // 检查是否已有数据
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('✓ 数据已存在，跳过初始数据插入');
    return;
  }

  // 插入默认管理员 (密码: admin123)
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)')
    .run('admin', hashedPassword, '管理员', 'admin');

  // 插入默认分类
  const insertCat = db.prepare('INSERT INTO categories (id, name, sort) VALUES (?, ?, ?)');
  insertCat.run(1, '热菜', 1);
  insertCat.run(2, '肉类', 2);
  insertCat.run(3, '素菜', 3);
  insertCat.run(5, '新品', 4);
  insertCat.run(6, '酒水', 5);
  insertCat.run(7, '主食', 6);

  // 插入默认菜品
  const insertDish = db.prepare('INSERT INTO dishes (id, name, price, category_id, image, description, ingredients, flavor, sales) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertDish.run(1, '宫保鸡丁', 28.00, 1, '/images/default-dish.png', '经典川菜，鸡肉鲜嫩，花生酥脆', '鸡胸肉、花生米、干辣椒', '麻辣', 156);
  insertDish.run(2, '麻婆豆腐', 22.00, 1, '/images/default-dish.png', '麻辣鲜香，豆腐嫩滑', '嫩豆腐、牛肉末、豆瓣酱', '麻辣', 203);
  insertDish.run(3, '红烧肉', 38.00, 2, '/images/default-dish.png', '肥而不腻，入口即化', '五花肉、冰糖、酱油', '咸鲜', 189);
  insertDish.run(4, '糖醋排骨', 36.00, 2, '/images/default-dish.png', '酸甜可口，排骨酥烂', '猪排骨、醋、糖', '酸甜', 175);
  insertDish.run(5, '清炒时蔬', 18.00, 3, '/images/default-dish.png', '新鲜时令蔬菜，清淡爽口', '时令蔬菜、蒜', '清淡', 98);
  insertDish.run(6, '蒜蓉西兰花', 20.00, 3, '/images/default-dish.png', '西兰花鲜嫩，蒜香浓郁', '西兰花、大蒜', '蒜香', 112);
  insertDish.run(7, '西红柿炒蛋', 16.00, 3, '/images/default-dish.png', '家常美味，酸甜适中', '西红柿、鸡蛋', '酸甜', 145);
  insertDish.run(8, '麻辣香锅', 42.00, 1, '/images/default-dish.png', '麻辣鲜香，多种食材', '虾、午餐肉、藕片', '麻辣', 87);
  insertDish.run(9, '酸辣粉', 16.00, 3, '/images/default-dish.png', '酸辣开胃，爽滑劲道', '红薯粉、花生、酸豆角', '酸辣', 134);
  insertDish.run(10, '蒜香鸡翅', 32.00, 2, '/images/default-dish.png', '蒜香浓郁，外酥里嫩', '鸡翅、大蒜', '蒜香', 97);
  insertDish.run(11, '剁椒鱼头', 48.00, 1, '/images/default-dish.png', '鲜辣开胃，鱼肉嫩滑', '鱼头、剁椒', '鲜辣', 72);
  insertDish.run(12, '藤椒鱼片', 32.00, 5, '/images/default-dish.png', '鲜藤椒入味，鱼片嫩滑', '鱼片、藤椒', '鲜辣', 45);
  insertDish.run(13, '芝士焗大虾', 48.00, 5, '/images/default-dish.png', '芝士浓郁，虾肉弹牙', '大虾、芝士', '咸鲜', 38);
  insertDish.run(14, '黑椒牛柳', 42.00, 5, '/images/default-dish.png', '黑椒香味浓郁，牛肉嫩滑', '牛肉、黑椒', '鲜辣', 52);
  insertDish.run(15, '冰镇可乐', 6.00, 6, '/images/default-dish.png', '冰爽可口', '可乐', '原味', 200);
  insertDish.run(16, '雪碧', 6.00, 6, '/images/default-dish.png', '清爽柠檬味', '雪碧', '原味', 180);
  insertDish.run(17, '鲜榨橙汁', 16.00, 6, '/images/default-dish.png', '新鲜橙子现榨', '橙子', '酸甜', 88);
  insertDish.run(18, '青岛啤酒', 10.00, 6, '/images/default-dish.png', '冰镇啤酒', '啤酒', '原味', 160);
  insertDish.run(19, '柠檬茶', 8.00, 6, '/images/default-dish.png', '冰爽解腻', '柠檬、茶', '酸甜', 120);
  insertDish.run(20, '白米饭', 3.00, 7, '/images/default-dish.png', '东北大米', '大米', '原味', 500);
  insertDish.run(21, '蛋炒饭', 12.00, 7, '/images/default-dish.png', '粒粒分明，蛋香浓郁', '鸡蛋、米饭', '咸鲜', 300);
  insertDish.run(22, '牛肉面', 18.00, 7, '/images/default-dish.png', '牛肉汤底，面条劲道', '牛肉、面条', '咸鲜', 210);
  insertDish.run(23, '扬州炒饭', 16.00, 7, '/images/default-dish.png', '火腿虾仁蛋炒', '火腿、虾仁、鸡蛋', '咸鲜', 180);
  insertDish.run(24, '手工水饺', 15.00, 7, '/images/default-dish.png', '猪肉白菜馅', '猪肉、白菜、面粉', '咸鲜', 150);

  // 插入默认餐桌
  const insertTable = db.prepare('INSERT INTO tables (table_no, capacity) VALUES (?, ?)');
  for (let i = 1; i <= 10; i++) {
    insertTable.run(`餐桌${i}`, i <= 4 ? 2 : (i <= 8 ? 4 : 6));
  }
});

insertData();
console.log('✓ 初始数据插入成功');
console.log('');
console.log('数据库初始化完成！');
console.log('默认管理员: admin / admin123');

db.close();
