const db = require('./db');

class User {
  static findById(id) {
    return db.prepare('SELECT id, username, nickname, phone, avatar, role, created_at FROM users WHERE id = ?').get(id) || null;
  }

  static findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
  }

  static create(data) {
    const bcrypt = require('bcryptjs');
    const { username, password, nickname, phone, role } = data;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password, nickname, phone, role) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(username, hashedPassword, nickname || '', phone || '', role || 'customer');
    return this.findById(result.lastInsertRowid);
  }

  static update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['nickname', 'phone', 'avatar', 'role'];
    for (const key of allowed) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]); }
    }
    if (fields.length === 0) return null;
    values.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  static validatePassword(username, password) {
    const bcrypt = require('bcryptjs');
    const user = this.findByUsername(username);
    if (!user) return null;
    const isValid = bcrypt.compareSync(password, user.password);
    return isValid ? user : null;
  }

  static findAll({ role, page = 1, pageSize = 20 } = {}) {
    let sql = 'SELECT id, username, nickname, phone, avatar, role, created_at FROM users WHERE 1=1';
    const values = [];
    if (role) { sql += ' AND role = ?'; values.push(role); }

    const countSql = sql.replace('SELECT id, username, nickname, phone, avatar, role, created_at', 'SELECT COUNT(*) as total');
    const { total } = db.prepare(countSql).get(...values);

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    values.push(pageSize, (page - 1) * pageSize);
    const list = db.prepare(sql).all(...values);
    return { list, total, page, pageSize };
  }

  static adminDelete(id) {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

module.exports = User;
