// pages/recommend/recommend.js
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    hotDishes: [], newDishes: [], comboDishes: [], guessDishes: [], ratedDishes: [],
    loading: true,
    showTablePicker: false, tables: [], selectedTable: null
  },

  onShow() {
    if (!app.requireLogin()) return;
    this.checkTable();
    this.loadRecommend();
  },

  // === 选桌 ===
  async checkTable() {
    const t = app.getTable();
    if (t) {
      this.setData({ selectedTable: t });
    } else {
      await this.loadTables();
      this.setData({ showTablePicker: true });
    }
  },

  async loadTables() {
    try { const r = await api.get('/tables/free'); this.setData({ tables: r.data || [] }); }
    catch (e) { /* ignore */ }
  },

  selectTable(e) {
    const table = this.data.tables[e.detail.value];
    if (table) {
      app.setTable({ id: table.id, table_no: table.table_no });
      this.setData({ selectedTable: table, showTablePicker: false });
      wx.showToast({ title: `已选 ${table.table_no}`, icon: 'success' });
    }
  },

  skipTable() {
    app.setTable(null);
    this.setData({ selectedTable: null, showTablePicker: false });
  },

  changeTable() {
    this.loadTables();
    this.setData({ showTablePicker: true });
  },

  // === 推荐 ===
  async loadRecommend() {
    this.setData({ loading: true });
    try {
      const recRes = await api.get('/dishes/recommend');
      const fixImages = (list) => (list || []).map(d => ({ ...d, image: api.getImageUrl(d.image) }));
      this.setData({
        hotDishes: fixImages(recRes.data.hot), newDishes: fixImages(recRes.data.new),
        ratedDishes: fixImages(recRes.data.topRated),
        comboDishes: (recRes.data.combo || []).map(g => ({ ...g, dishes: (g.dishes || []).map(d => ({ ...d, image: api.getImageUrl(d.image) })) })),
        loading: false
      });
      this.loadGuess();
    } catch (err) { console.error(err); this.setData({ loading: false }); }
  },

  async loadGuess() {
    try { const r = await api.get('/dishes/recommend/guess'); const fix = l => (l||[]).map(d=>({...d,image:api.getImageUrl(d.image)})); this.setData({ guessDishes: fix(r.data) }); }
    catch (e) { console.error(e); }
  },

  async addToCart(e) {
    const dish = e.currentTarget.dataset.dish;
    try { await api.post('/cart', { dish_id: dish.id, quantity: 1 }); wx.showToast({ title: '已加入购物车', icon: 'success' }); }
    catch (err) { wx.showToast({ title: err.message || '添加失败', icon: 'none' }); }
  },

  async addCombo(e) {
    const combo = e.currentTarget.dataset.combo;
    try { for (const d of combo.dishes) await api.post('/cart', { dish_id: d.id, quantity: 1 }); wx.showToast({ title: '套餐已加入购物车', icon: 'success' }); }
    catch (err) { wx.showToast({ title: err.message || '添加失败', icon: 'none' }); }
  },

  goMenu() { wx.switchTab({ url: '/pages/index/index' }); },
  goChat() { wx.navigateTo({ url: '/pages/chat/chat' }); },
  onPullDownRefresh() { this.loadRecommend().then(() => wx.stopPullDownRefresh()); }
});
