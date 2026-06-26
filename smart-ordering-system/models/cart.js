const db = require('./db');

class Cart {
  static findByUserId(userId) {
    return db.prepare(
      `SELECT ci.*, d.name, d.price, d.image, d.description, d.ingredients, d.category_id, c.name as category_name
       FROM cart_items ci
       JOIN dishes d ON ci.dish_id = d.id
       LEFT JOIN categories c ON d.category_id = c.id
       WHERE ci.user_id = ? AND d.status = 'on'
       ORDER BY ci.created_at DESC`
    ).all(userId);
  }

  static addItem(userId, dishId, quantity = 1) {
    // SQLite使用 INSERT OR REPLACE 配合子查询实现累加
    const existing = db.prepare(
      'SELECT quantity FROM cart_items WHERE user_id = ? AND dish_id = ?'
    ).get(userId, dishId);

    if (existing) {
      db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND dish_id = ?')
        .run(quantity, userId, dishId);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, dish_id, quantity) VALUES (?, ?, ?)')
        .run(userId, dishId, quantity);
    }
  }

  static updateQuantity(userId, dishId, quantity) {
    if (quantity <= 0) {
      return this.removeItem(userId, dishId);
    }
    const result = db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND dish_id = ?')
      .run(quantity, userId, dishId);
    return result.changes > 0;
  }

  static removeItem(userId, dishId) {
    const result = db.prepare('DELETE FROM cart_items WHERE user_id = ? AND dish_id = ?')
      .run(userId, dishId);
    return result.changes > 0;
  }

  static clear(userId) {
    const result = db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    return result.changes > 0;
  }

  static getItemCount(userId) {
    const row = db.prepare('SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE user_id = ?')
      .get(userId);
    return row.count;
  }
}

module.exports = Cart;
