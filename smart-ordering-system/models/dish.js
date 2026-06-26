const db = require('./db');

class Dish {
  static findAll({ categoryId, status, keyword } = {}) {
    let sql = `SELECT d.*, c.name as category_name FROM dishes d LEFT JOIN categories c ON d.category_id = c.id WHERE 1=1`;
    const values = [];
    if (categoryId) { sql += ' AND d.category_id = ?'; values.push(categoryId); }
    if (status) { sql += ' AND d.status = ?'; values.push(status); }
    if (keyword) { sql += ' AND d.name LIKE ?'; values.push(`%${keyword}%`); }
    sql += ' ORDER BY d.id ASC';
    return db.prepare(sql).all(...values);
  }

  static findById(id) {
    return db.prepare(
      'SELECT d.*, c.name as category_name FROM dishes d LEFT JOIN categories c ON d.category_id = c.id WHERE d.id = ?'
    ).get(id) || null;
  }

  static create(data) {
    const { name, price, category_id, image, description, ingredients, flavor } = data;
    const stmt = db.prepare(
      'INSERT INTO dishes (name, price, category_id, image, description, ingredients, flavor) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(name, price, category_id, image || '/images/default-dish.png', description || '', ingredients || '', flavor || '');
    return this.findById(result.lastInsertRowid);
  }

  static update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['name', 'price', 'category_id', 'image', 'description', 'ingredients', 'flavor', 'status'];
    for (const key of allowed) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]); }
    }
    if (fields.length === 0) return null;
    values.push(id);
    db.prepare(`UPDATE dishes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  static delete(id) {
    const result = db.prepare('DELETE FROM dishes WHERE id = ?').run(id);
    return result.changes > 0;
  }

  static incrementSales(id, quantity) {
    db.prepare('UPDATE dishes SET sales = sales + ? WHERE id = ?').run(quantity, id);
  }

  // 智能推荐
  static getRecommendations() {
    // 人气热销：按销量降序
    const hot = db.prepare(
      `SELECT d.*, c.name as category_name FROM dishes d LEFT JOIN categories c ON d.category_id = c.id WHERE d.status = 'on' ORDER BY d.sales DESC LIMIT 6`
    ).all();

    // 新品推荐：按创建时间降序
    const newDishes = db.prepare(
      `SELECT d.*, c.name as category_name FROM dishes d LEFT JOIN categories c ON d.category_id = c.id WHERE d.status = 'on' ORDER BY d.created_at DESC LIMIT 6`
    ).all();

    // 搭配推荐：按分类组合
    const categories = db.prepare(
      `SELECT id, name FROM categories ORDER BY sort ASC`
    ).all();

    const combo = [];
    for (const cat of categories) {
      const catDishes = db.prepare(
        `SELECT id, name, price, image FROM dishes WHERE category_id = ? AND status = 'on' LIMIT 3`
      ).all(cat.id);
      if (catDishes.length >= 2) {
        const totalPrice = catDishes.reduce((sum, d) => sum + d.price, 0);
        combo.push({
          id: cat.id,
          name: cat.name + '套餐',
          totalPrice: Math.round(totalPrice * 100) / 100,
          dishes: catDishes
        });
      }
    }

    // 好评推荐：按平均评分降序
    const topRated = db.prepare(
      `SELECT d.*, c.name as category_name,
        ROUND(AVG(r.rating), 1) as avg_rating,
        COUNT(r.id) as review_count
       FROM dishes d
       LEFT JOIN categories c ON d.category_id = c.id
       LEFT JOIN reviews r ON r.dish_id = d.id
       WHERE d.status = 'on'
       GROUP BY d.id
       HAVING review_count > 0
       ORDER BY avg_rating DESC, review_count DESC
       LIMIT 6`
    ).all();

    return { hot, new: newDishes, combo, topRated };
  }

  // 猜你喜欢：根据历史订单的口味推荐
  static getGuessYouLike(userId) {
    // 获取用户历史订单中的菜品口味
    const flavors = db.prepare(
      `SELECT DISTINCT d.flavor FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN dishes d ON oi.dish_id = d.id
       WHERE o.user_id = ? AND o.status IN ('paid', 'cooking', 'done')
       AND d.flavor IS NOT NULL AND d.flavor != ''`
    ).all(userId).map(r => r.flavor);

    if (flavors.length === 0) {
      // 没有历史订单，按销量推荐
      return db.prepare(
        `SELECT d.*, c.name as category_name FROM dishes d
         LEFT JOIN categories c ON d.category_id = c.id
         WHERE d.status = 'on' ORDER BY d.sales DESC LIMIT 6`
      ).all();
    }

    // 获取用户已点过的菜品ID
    const orderedIds = db.prepare(
      `SELECT DISTINCT oi.dish_id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = ?`
    ).all(userId).map(r => r.dish_id);

    // 口味占位
    const placeholders = flavors.map(() => '?').join(',');
    const params = [...flavors];

    let excludeClause = '';
    const excludeParams = [];
    if (orderedIds.length > 0) {
      excludeClause = `AND d.id NOT IN (${orderedIds.map(() => '?').join(',')})`;
      excludeParams.push(...orderedIds);
    }

    let result = db.prepare(
      `SELECT d.*, c.name as category_name,
        COALESCE(ROUND(AVG(r.rating), 1), 0) as avg_rating,
        COUNT(r.id) as review_count
       FROM dishes d
       LEFT JOIN categories c ON d.category_id = c.id
       LEFT JOIN reviews r ON r.dish_id = d.id
       WHERE d.status = 'on' AND d.flavor IN (${placeholders})
       ${excludeClause}
       GROUP BY d.id
       ORDER BY (d.sales * 0.6 + COALESCE(AVG(r.rating), 0) * 10 * 0.4) DESC
       LIMIT 6`
    ).all(...params, ...excludeParams);

    // 如果口味匹配结果为空，排除已点后按销量推荐其他口味
    if (result.length === 0) {
      const fallbackParams = orderedIds.length > 0 ? [...orderedIds] : [];
      let fallbackSql = `SELECT d.*, c.name as category_name FROM dishes d
       LEFT JOIN categories c ON d.category_id = c.id
       WHERE d.status = 'on'`;
      if (orderedIds.length > 0) {
        fallbackSql += ` AND d.id NOT IN (${orderedIds.map(() => '?').join(',')})`;
      }
      fallbackSql += ` ORDER BY d.sales DESC LIMIT 6`;
      result = db.prepare(fallbackSql).all(...fallbackParams);
    }

    return result;
  }

  // 基于用户评价的加权内容推荐：评分偏好 + 评价关键词 + 销量/均分
  static getRecommendByReviews(userId) {
    const reviews = db.prepare(
      `SELECT r.rating, r.content, d.id as dish_id, d.flavor, d.category_id
       FROM reviews r
       JOIN dishes d ON r.dish_id = d.id
       WHERE r.user_id = ?`
    ).all(userId);

    if (reviews.length === 0) {
      return this.getSalesFallback();
    }

    const flavorScore = {};
    const categoryScore = {};
    const keywordScore = {};
    const reviewedIds = [];

    for (const review of reviews) {
      reviewedIds.push(review.dish_id);
      const weight = review.rating - 3;

      if (review.flavor) {
        flavorScore[review.flavor] = (flavorScore[review.flavor] || 0) + weight;
      }

      if (review.category_id) {
        categoryScore[review.category_id] = (categoryScore[review.category_id] || 0) + weight;
      }

      for (const flavor of this.extractReviewFlavors(review.content || '')) {
        keywordScore[flavor] = (keywordScore[flavor] || 0) + weight;
      }
    }

    const orderedIds = db.prepare(
      `SELECT DISTINCT oi.dish_id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = ?`
    ).all(userId).map(r => r.dish_id);

    const excludedIds = [...new Set([...reviewedIds, ...orderedIds])];
    const params = [];
    let excludeClause = '';
    if (excludedIds.length > 0) {
      excludeClause = `AND d.id NOT IN (${excludedIds.map(() => '?').join(',')})`;
      params.push(...excludedIds);
    }

    const candidates = db.prepare(
      `SELECT d.*, c.name as category_name,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(r.id) as review_count
       FROM dishes d
       LEFT JOIN categories c ON d.category_id = c.id
       LEFT JOIN reviews r ON d.id = r.dish_id
       WHERE d.status = 'on'
       ${excludeClause}
       GROUP BY d.id`
    ).all(...params);

    if (candidates.length === 0) {
      return this.getSalesFallback(excludedIds);
    }

    const maxSales = Math.max(...candidates.map(d => d.sales || 0), 1);
    const scored = candidates.map(dish => {
      const flavorMatch = flavorScore[dish.flavor] || 0;
      const categoryMatch = categoryScore[dish.category_id] || 0;
      const keywordMatch = keywordScore[dish.flavor] || 0;
      const salesScore = (dish.sales || 0) / maxSales;
      const ratingScore = (dish.avg_rating || 0) / 5;

      const recommendScore =
        flavorMatch * 0.4 +
        categoryMatch * 0.2 +
        keywordMatch * 0.2 +
        salesScore * 0.1 +
        ratingScore * 0.1;

      return {
        ...dish,
        recommend_score: Math.round(recommendScore * 100) / 100
      };
    });

    const result = scored
      .filter(d => d.recommend_score > 0)
      .sort((a, b) => b.recommend_score - a.recommend_score)
      .slice(0, 6);

    return result.length > 0 ? result : this.getSalesFallback(excludedIds);
  }

  static extractReviewFlavors(content) {
    const flavors = [];
    if (content.includes('辣') || content.includes('麻辣') || content.includes('够味')) flavors.push('麻辣');
    if (content.includes('清淡') || content.includes('不油腻')) flavors.push('清淡');
    if (content.includes('酸甜') || content.includes('开胃')) flavors.push('酸甜');
    if (content.includes('蒜香')) flavors.push('蒜香');
    if (content.includes('鲜辣')) flavors.push('鲜辣');
    if (content.includes('咸鲜')) flavors.push('咸鲜');
    return [...new Set(flavors)];
  }

  static getSalesFallback(excludedIds = []) {
    const params = [];
    let excludeClause = '';
    if (excludedIds.length > 0) {
      excludeClause = `AND d.id NOT IN (${excludedIds.map(() => '?').join(',')})`;
      params.push(...excludedIds);
    }

    return db.prepare(
      `SELECT d.*, c.name as category_name
       FROM dishes d
       LEFT JOIN categories c ON d.category_id = c.id
       WHERE d.status = 'on'
       ${excludeClause}
       ORDER BY d.sales DESC LIMIT 6`
    ).all(...params);
  }
}

module.exports = Dish;
