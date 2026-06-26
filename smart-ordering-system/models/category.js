const db = require('./db');

class Category {
  static findAll() {
    return db.prepare('SELECT * FROM categories ORDER BY sort ASC, id ASC').all();
  }

  static findById(id) {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) || null;
  }

  static create(data) {
    const { name, sort } = data;
    const stmt = db.prepare('INSERT INTO categories (name, sort) VALUES (?, ?)');
    const result = stmt.run(name, sort || 0);
    return { id: Number(result.lastInsertRowid), name, sort: sort || 0 };
  }

  static update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.sort !== undefined) { fields.push('sort = ?'); values.push(data.sort); }
    if (fields.length === 0) return null;
    values.push(id);
    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  static delete(id) {
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return result.changes > 0;
  }

  static hasDishes(id) {
    const row = db.prepare('SELECT COUNT(*) as count FROM dishes WHERE category_id = ?').get(id);
    return row.count > 0;
  }
}

module.exports = Category;
