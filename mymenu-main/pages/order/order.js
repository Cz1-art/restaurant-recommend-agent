// pages/order/order.js
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    orders: [],
    currentTab: 'all',
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'pending', name: '待支付' },
      { key: 'paid', name: '已支付' },
      { key: 'done', name: '已完成' },
      { key: 'cancelled', name: '已取消' }
    ],
    showReviewModal: false,
    reviewOrderId: null,
    reviewDishes: [],
    reviewRating: 5,
    reviewContent: ''
  },

  onShow() { if (!app.requireLogin()) return; this.loadOrders(); },

  async loadOrders() {
    const status = this.data.currentTab === 'all' ? '' : this.data.currentTab;
    try { const r = await api.get(`/orders/my?status=${status}`); this.setData({ orders: r.data.list }); }
    catch (e) { console.error(e); }
  },

  switchTab(e) { this.setData({ currentTab: e.currentTarget.dataset.tab }); this.loadOrders(); },

  getStatusText(s) { return { pending: '待支付', paid: '已支付', done: '已完成', cancelled: '已取消' }[s] || s; },

  async payOrder(e) {
    const o = this.data.orders.find(o => o.id === e.currentTarget.dataset.id);
    if (!o) return;
    const m = await new Promise(r => wx.showModal({ title: '确认支付', content: `订单金额：¥${o.total_price}\n确认支付吗？`, confirmText: '确认支付', confirmColor: '#ff6b35', success: r }));
    if (!m.confirm) return;
    wx.showLoading({ title: '支付处理中...', mask: true });
    await new Promise(r => setTimeout(r, 1500));
    try { await api.put(`/orders/${o.id}/pay`); wx.hideLoading(); wx.showToast({ title: '支付成功！', icon: 'success' }); this.loadOrders(); }
    catch (e) { wx.hideLoading(); wx.showToast({ title: e.message || '支付失败', icon: 'none' }); }
  },

  async cancelOrder(e) {
    const o = this.data.orders.find(o => o.id === e.currentTarget.dataset.id);
    if (!o) return;
    const m = await new Promise(r => wx.showModal({ title: '确认取消', content: `确定取消该订单吗？`, confirmText: '确认取消', confirmColor: '#ff4d4f', success: r }));
    if (!m.confirm) return;
    try { await api.put(`/orders/${o.id}/cancel`); wx.showToast({ title: '订单已取消', icon: 'success' }); this.loadOrders(); }
    catch (e) { wx.showToast({ title: e.message || '取消失败', icon: 'none' }); }
  },

  // === 评价 ===
  openReview(e) {
    const o = this.data.orders.find(o => o.id === e.currentTarget.dataset.id);
    if (!o) return;
    this.setData({ showReviewModal: true, reviewOrderId: o.id, reviewDishes: o.items || [], reviewRating: 5, reviewContent: '' });
  },
  closeReview() { this.setData({ showReviewModal: false }); },
  setRating(e) { this.setData({ reviewRating: parseInt(e.currentTarget.dataset.rating) }); },
  onReviewInput(e) { this.setData({ reviewContent: e.detail.value }); },
  async submitReview(e) {
    const dishId = e.currentTarget.dataset.dishid;
    try {
      await api.post('/reviews', { dish_id: dishId, order_id: this.data.reviewOrderId, rating: this.data.reviewRating, content: this.data.reviewContent });
      wx.showToast({ title: '评价成功！', icon: 'success' });
      this.loadOrders();
    } catch (e) { wx.showToast({ title: e.message || '评价失败', icon: 'none' }); }
  },

  logout() {
    wx.showModal({ title: '退出登录', content: '确定退出当前账号？', confirmText: '退出', confirmColor: '#ff4d4f', success: r => { if (r.confirm) app.logout(); } });
  }
});
