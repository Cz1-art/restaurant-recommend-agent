// pages/index/index.js
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    categories: [], flavors: [], dishes: [], filteredDishes: [],
    currentCategoryId: 0, currentFlavor: '', filterMode: 'category',
    searchKeyword: '', favIds: {}, showFavOnly: false
  },

  onShow() {
    if (!app.requireLogin()) return;
    this.loadData();
    this.loadFavorites();
  },

  async loadData() {
    try {
      const [catRes, dishRes] = await Promise.all([
        api.get('/categories'), api.get('/dishes')
      ]);
      const dishes = (dishRes.data || []).map(d => ({ ...d, image: api.getImageUrl(d.image) }));
      const flavorSet = new Set();
      dishes.forEach(d => { if (d.flavor) flavorSet.add(d.flavor); });
      this.setData({ categories: catRes.data, flavors: Array.from(flavorSet), dishes, searchKeyword: '' });
      this.applyFilters();
    } catch (err) { console.error('加载数据失败', err); }
  },

  async loadFavorites() {
    try {
      const res = await api.get('/favorites');
      const map = {};
      (res.data || []).forEach(f => { map[f.dish_id] = true; });
      this.setData({ favIds: map });
      this.applyFilters();
    } catch (e) { /* ignore */ }
  },

  applyFilters() {
    let r = this.data.dishes;
    const kw = this.data.searchKeyword.trim().toLowerCase();
    if (kw) r = r.filter(d => d.name.toLowerCase().includes(kw) || (d.description||'').toLowerCase().includes(kw) || (d.ingredients||'').toLowerCase().includes(kw));
    if (this.data.currentCategoryId !== 0) r = r.filter(d => d.category_id === this.data.currentCategoryId);
    if (this.data.currentFlavor) r = r.filter(d => d.flavor === this.data.currentFlavor);
    if (this.data.showFavOnly) r = r.filter(d => this.data.favIds[d.id]);
    this.setData({ filteredDishes: r });
  },

  isFav(dishId) { return !!this.data.favIds[dishId]; },

  switchCategory(e) { this.setData({ currentCategoryId: parseInt(e.currentTarget.dataset.id), filterMode: 'category' }); this.applyFilters(); },
  switchFlavor(e) { this.setData({ currentFlavor: e.currentTarget.dataset.flavor || '', filterMode: 'flavor' }); this.applyFilters(); },
  switchFilterMode(e) { this.setData({ filterMode: e.currentTarget.dataset.mode }); },
  toggleFavOnly() { this.setData({ showFavOnly: !this.data.showFavOnly }); this.applyFilters(); },
  onSearchInput(e) { this.setData({ searchKeyword: e.detail.value }); this.applyFilters(); },
  clearSearch() { this.setData({ searchKeyword: '' }); this.applyFilters(); },

  async toggleFavorite(e) {
    const dishId = parseInt(e.currentTarget.dataset.id);
    const isFav = !!this.data.favIds[dishId];
    const favIds = { ...this.data.favIds };
    try {
      if (isFav) {
        await api.delete(`/favorites/${dishId}`);
        delete favIds[dishId];
      } else {
        await api.post(`/favorites/${dishId}`);
        favIds[dishId] = true;
      }
      this.setData({ favIds });
      this.applyFilters();
    } catch (err) { wx.showToast({ title: err.message || '操作失败', icon: 'none' }); }
  },

  async addToCart(e) {
    const dish = e.currentTarget.dataset.dish;
    try {
      await api.post('/cart', { dish_id: dish.id, quantity: 1 });
      wx.showToast({ title: '已加入购物车', icon: 'success', duration: 1500 });
    } catch (err) { wx.showToast({ title: err.message || '添加失败', icon: 'none' }); }
  }
});
