const db = require('./db');

class Favorite {
  static findByUser(userId) {
    return db.prepare(
      `SELECT f.*, d.name as dish_name, d.price, d.image, d.flavor
       FROM favorites f JOIN dishes d ON f.dish_id = d.id
       WHERE f.user_id = ? ORDER BY f.created_at DESC`
    ).all(userId);
  }

  static add(userId, dishId) {
    const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND dish_id = ?').get(userId, dishId);
    if (existing) return existing;
    const r = db.prepare('INSERT INTO favorites (user_id, dish_id) VALUES (?, ?)').run(userId, dishId);
    return { id: r.lastInsertRowid, user_id: userId, dish_id: dishId };
  }

  static remove(userId, dishId) {
    return db.prepare('DELETE FROM favorites WHERE user_id = ? AND dish_id = ?').run(userId, dishId).changes > 0;
  }

  static isFavorited(userId, dishId) {
    return !!db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND dish_id = ?').get(userId, dishId);
  }

  // 所有收藏统计（按菜品）
  static getGroupedStats() {
    return db.prepare(
      `SELECT f.dish_id, d.name as dish_name, COUNT(*) as count
       FROM favorites f JOIN dishes d ON f.dish_id = d.id
       GROUP BY f.dish_id ORDER BY count DESC LIMIT 20`
    ).all();
  }
}

module.exports = Favorite;
