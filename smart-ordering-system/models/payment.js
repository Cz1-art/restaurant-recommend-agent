const db = require('./db');

class Payment {
  static findByOrder(orderId) {
    return db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC').all(orderId);
  }

  static findByUser(userId) {
    return db.prepare(
      `SELECT p.*, o.order_no FROM payments p JOIN orders o ON p.order_id = o.id
       WHERE p.user_id = ? ORDER BY p.created_at DESC`
    ).all(userId);
  }

  static create(orderId, userId, amount, method) {
    const r = db.prepare('INSERT INTO payments (order_id, user_id, amount, method) VALUES (?, ?, ?, ?)').run(orderId, userId, amount, method || '模拟支付');
    return db.prepare('SELECT * FROM payments WHERE id = ?').get(r.lastInsertRowid);
  }

  static findAll({ page = 1, pageSize = 50 } = {}) {
    const sql = 'SELECT p.*, o.order_no FROM payments p JOIN orders o ON p.order_id = o.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    const total = db.prepare('SELECT COUNT(*) as count FROM payments').get().count;
    return { list: db.prepare(sql).all(pageSize, (page - 1) * pageSize), total, page, pageSize };
  }

  static getStats() {
    return db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM payments WHERE status='success'").get();
  }
}

module.exports = Payment;
