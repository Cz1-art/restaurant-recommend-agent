const db = require('./db');

class Table {
  static findAll() {
    return db.prepare('SELECT * FROM tables ORDER BY id ASC').all();
  }

  static findById(id) { return db.prepare('SELECT * FROM tables WHERE id = ?').get(id) || null; }

  static create(data) {
    const r = db.prepare('INSERT INTO tables (table_no, capacity) VALUES (?, ?)').run(data.table_no, data.capacity || 4);
    return this.findById(r.lastInsertRowid);
  }

  static update(id, data) {
    const fields = []; const vals = [];
    const allowed = ['table_no', 'capacity', 'status'];
    for (const k of allowed) { if (data[k] !== undefined) { fields.push(`${k}=?`); vals.push(data[k]); } }
    if (fields.length === 0) return null;
    vals.push(id);
    db.prepare(`UPDATE tables SET ${fields.join(',')} WHERE id=?`).run(...vals);
    return this.findById(id);
  }

  static delete(id) { return db.prepare('DELETE FROM tables WHERE id=?').run(id).changes > 0; }

  static getFree() { return db.prepare("SELECT * FROM tables WHERE status='free' ORDER BY id ASC").all(); }
}

module.exports = Table;
