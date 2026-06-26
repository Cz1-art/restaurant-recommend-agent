// pages/cart/cart.js
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    cart: [], totalPrice: 0, totalCount: 0,
    remark: '', tables: [], selectedTableId: 0, selectedTableName: '不选桌号'
  },

  onShow() {
    if (!app.requireLogin()) return;
    const t = app.getTable();
    if (t) this.setData({ selectedTableId: t.id, selectedTableName: t.table_no });
    this.loadCart();
    this.loadTables();
  },

  async loadCart() {
    try {
      const res = await api.get('/cart');
      const { items, totalPrice, totalCount } = res.data;
      this.setData({ cart: items, totalPrice: totalPrice.toFixed(2), totalCount });
    } catch (err) { console.error(err); }
  },

  async loadTables() {
    try {
      const res = await api.get('/tables/free');
      this.setData({ tables: res.data || [] });
    } catch (e) { /* ignore */ }
  },

  async increaseQty(e) {
    const id = e.currentTarget.dataset.dishid;
    const item = this.data.cart.find(i => i.dish_id === id);
    if (!item) return;
    try { await api.put(`/cart/${id}`, { quantity: item.quantity + 1 }); this.loadCart(); }
    catch (e) { wx.showToast({ title: e.message || '操作失败', icon: 'none' }); }
  },

  async decreaseQty(e) {
    const id = e.currentTarget.dataset.dishid;
    const item = this.data.cart.find(i => i.dish_id === id);
    if (!item) return;
    if (item.quantity > 1) {
      try { await api.put(`/cart/${id}`, { quantity: item.quantity - 1 }); this.loadCart(); }
      catch (e) { wx.showToast({ title: e.message || '操作失败', icon: 'none' }); }
    } else { this.deleteItem(e); }
  },

  async deleteItem(e) {
    const id = e.currentTarget.dataset.dishid;
    try { await api.delete(`/cart/${id}`); this.loadCart(); }
    catch (e) { wx.showToast({ title: e.message || '删除失败', icon: 'none' }); }
  },

  onTableChange(e) {
    const idx = e.detail.value;
    const table = this.data.tables[idx];
    if (table) this.setData({ selectedTableId: table.id, selectedTableName: `桌号：${table.table_no}` });
    else this.setData({ selectedTableId: 0, selectedTableName: '不选桌号' });
  },

  onRemarkInput(e) { this.setData({ remark: e.detail.value }); },

  checkout() {
    if (this.data.cart.length === 0) return wx.showToast({ title: '购物车为空', icon: 'none' });
    let content = `订单金额：¥${this.data.totalPrice}`;
    if (this.data.selectedTableId) content += `\n${this.data.selectedTableName}`;
    if (this.data.remark.trim()) content += `\n备注：${this.data.remark.trim()}`;
    wx.showModal({
      title: '确认下单', content, confirmText: '提交订单', confirmColor: '#ff6b35',
      success: (r) => { if (r.confirm) this.createOrder(); }
    });
  },

  async createOrder() {
    const t = app.getTable();
    try {
      await api.post('/orders', {
        remark: this.data.remark.trim(),
        table_id: t ? t.id : (this.data.selectedTableId || undefined)
      });
      wx.showToast({ title: '下单成功，请去支付', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/order/order' }), 1500);
    } catch (err) { wx.showToast({ title: err.message || '下单失败', icon: 'none' }); }
  },

  goMenu() { wx.switchTab({ url: '/pages/index/index' }); }
});
