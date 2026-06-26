const db = require('./db');

class Order {
  static findAll({ userId, status, page = 1, pageSize = 20 } = {}) {
    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    let dataSql = 'SELECT * FROM orders WHERE 1=1';
    const values = [];

    if (userId) {
      countSql += ' AND user_id = ?';
      dataSql += ' AND user_id = ?';
      values.push(userId);
    }
    if (status) {
      countSql += ' AND status = ?';
      dataSql += ' AND status = ?';
      values.push(status);
    }

    const { total } = db.prepare(countSql).get(...values);

    dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const rows = db.prepare(dataSql).all(...values, pageSize, (page - 1) * pageSize);

    // 获取每个订单的明细
    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    for (const order of rows) {
      order.items = getItems.all(order.id);
    }

    return { list: rows, total, page, pageSize };
  }

  static findById(id) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return null;
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    return order;
  }

  static findByOrderNo(orderNo) {
    const order = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo);
    if (!order) return null;
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return order;
  }

  static create(userId, orderData) {
    const { remark, table_no, table_id } = orderData || {};

    // 使用事务
    const createOrderTx = db.transaction(() => {
      // 获取购物车
      const cartItems = db.prepare(
        `SELECT ci.quantity, ci.dish_id, d.name as dish_name, d.price as dish_price, d.image as dish_image
         FROM cart_items ci JOIN dishes d ON ci.dish_id = d.id
         WHERE ci.user_id = ?`
      ).all(userId);

      if (cartItems.length === 0) {
        throw new Error('购物车为空');
      }

      // 计算总金额和总数量
      let totalPrice = 0;
      let totalCount = 0;
      const items = cartItems.map(item => {
        const subtotal = Math.round(item.dish_price * item.quantity * 100) / 100;
        totalPrice += subtotal;
        totalCount += item.quantity;
        return {
          dish_id: item.dish_id,
          dish_name: item.dish_name,
          dish_price: item.dish_price,
          dish_image: item.dish_image,
          quantity: item.quantity,
          subtotal
        };
      });

      totalPrice = Math.round(totalPrice * 100) / 100;

      // 生成订单号
      const now = new Date();
      const orderNo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

      // 创建订单
      const orderResult = db.prepare(
        `INSERT INTO orders (order_no, user_id, total_price, total_count, status, remark, table_no, table_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(orderNo, userId, totalPrice, totalCount, 'pending', remark || '', table_no || '', table_id || null);

      const orderId = Number(orderResult.lastInsertRowid);

      // 插入订单明细
      const insertItem = db.prepare(
        'INSERT INTO order_items (order_id, dish_id, dish_name, dish_price, dish_image, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      const updateSales = db.prepare('UPDATE dishes SET sales = sales + ? WHERE id = ?');

      for (const item of items) {
        insertItem.run(orderId, item.dish_id, item.dish_name, item.dish_price, item.dish_image, item.quantity, item.subtotal);
        updateSales.run(item.quantity, item.dish_id);
      }

      // 清空购物车
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);

      return orderId;
    });

    const orderId = createOrderTx();
    return this.findById(orderId);
  }

  static updateStatus(id, status) {
    const allowedStatus = ['pending', 'paid', 'cooking', 'done', 'cancelled'];
    if (!allowedStatus.includes(status)) {
      throw new Error(`无效的订单状态: ${status}`);
    }
    const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    return result.changes > 0 ? this.findById(id) : null;
  }

  static getStats() {
    const orderStats = db.prepare(
      'SELECT status, COUNT(*) as count, COALESCE(SUM(total_price), 0) as total FROM orders GROUP BY status'
    ).all();

    const todayStats = db.prepare(
      "SELECT COUNT(*) as count, COALESCE(SUM(total_price), 0) as total FROM orders WHERE DATE(created_at) = DATE('now', 'localtime')"
    ).get();

    const totalStats = db.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(total_price), 0) as total FROM orders'
    ).get();

    return { orderStats, todayStats, totalStats };
  }
}

module.exports = Order;
