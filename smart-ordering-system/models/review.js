const db = require('./db');

class Review {
  static findByDish(dishId) {
    return db.prepare(
      `SELECT r.*, u.nickname, u.username FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.dish_id = ? ORDER BY r.created_at DESC`
    ).all(dishId);
  }

  static findByUser(userId) {
    return db.prepare(
      `SELECT r.*, d.name as dish_name FROM reviews r
       JOIN dishes d ON r.dish_id = d.id
       WHERE r.user_id = ? ORDER BY r.created_at DESC`
    ).all(userId);
  }

  static findByOrder(orderId) {
    return db.prepare('SELECT * FROM reviews WHERE order_id = ?').all(orderId);
  }

  static create(userId, dishId, orderId, rating, content) {
    const r = db.prepare(
      'INSERT INTO reviews (user_id, dish_id, order_id, rating, content) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, dishId, orderId, rating, content || '');
    return db.prepare('SELECT * FROM reviews WHERE id = ?').get(r.lastInsertRowid);
  }

  static findAll() {
    return db.prepare(
      `SELECT r.*, u.username, u.nickname, d.name as dish_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN dishes d ON r.dish_id = d.id
       ORDER BY r.created_at DESC LIMIT 100`
    ).all();
  }

  static getStats(dishId) {
    return db.prepare(
      `SELECT COUNT(*) as count, ROUND(AVG(rating), 1) as avg_rating FROM reviews WHERE dish_id = ?`
    ).get(dishId);
  }

  static getGlobalStats() {
    return db.prepare('SELECT COUNT(*) as count, ROUND(AVG(rating),1) as avg_rating FROM reviews').get();
  }
}

module.exports = Review;
