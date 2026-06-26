// pages/admin/admin.js
const api = require('../../utils/api');
const app = getApp();

let currentOrderFilter = '';

Page({
  data: {
    isStaff: false, role: '', roleName: '',
    dishes: [], categories: [], orders: [],
    tables: [], showTableModal: false, editingTableId: null,
    tableForm: { table_no: '', capacity: 4 },
    currentTab: 'all',
    tabs: [
      { key: 'all', name: '全部' }, { key: 'pending', name: '待支付' },
      { key: 'paid', name: '已支付' }, { key: 'cooking', name: '制作中' },
      { key: 'done', name: '已完成' }, { key: 'cancelled', name: '已取消' }
    ],
    showDishModal: false, isEditDish: false, editingDishId: null,
    dishForm: { name: '', price: '', category_id: '', description: '', ingredients: '', flavor: '', image: '/images/default-dish.png' },
    selectedCategoryName: '',
    flavorOptions: ['麻辣', '酸辣', '清淡', '咸鲜', '酸甜', '蒜香', '鲜辣', '香辣', '微辣', '原味'],
    selectedFlavorIndex: -1
  },

  onShow() {
    if (!app.requireLogin()) return;
    let userInfo = app.globalData.userInfo;
    if (!userInfo || !userInfo.role) {
      userInfo = wx.getStorageSync('userInfo');
    }
    const role = userInfo ? userInfo.role : '';
    const roleMap = { admin: '管理员', staff: '餐厅员工' };
    if (!role || role === 'customer') {
      this.setData({ isStaff: false, role: '' });
      return;
    }
    this.setData({ isStaff: true, role, roleName: roleMap[role] || role });
    this.loadPageData();
  },

  async loadPageData() {
    if (this.data.role === 'admin') {
      this.loadData(); // 管理员加载完整数据
    } else {
      this.loadOrders(); // 员工只加载订单
    }
  },

  // === 管理员：菜品+分类管理 ===
  async loadData() {
    try {
      const [dishRes, catRes, tableRes] = await Promise.all([
        api.get('/dishes'), api.get('/categories'), api.get('/tables')
      ]);
      const dishes = (dishRes.data || []).map(d => ({ ...d, image: api.getImageUrl(d.image) }));
      this.setData({ dishes, categories: catRes.data, tables: tableRes.data || [] });
    } catch (err) { console.error('加载数据失败', err); }
    this.loadOrders();
  },

  // === 订单管理（所有角色共享） ===
  async loadOrders() {
    try {
      const status = this.data.currentTab === 'all' ? '' : this.data.currentTab;
      const res = await api.get(`/orders?status=${status}`);
      this.setData({ orders: res.data.list || [] });
    } catch (err) { console.error('加载订单失败', err); }
  },

  switchTab(e) {
    this.data.currentTab = e.currentTarget.dataset.tab;
    this.loadOrders();
  },

  getStatusText(status) {
    const map = { pending: '待支付', paid: '已支付', cooking: '制作中', done: '已完成', cancelled: '已取消' };
    return map[status] || status;
  },

  async updateOrderStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    if (!status) return;
    try {
      await api.put(`/orders/${id}/status`, { status });
      wx.showToast({ title: '状态已更新', icon: 'success' });
      this.loadOrders();
    } catch (err) {
      wx.showToast({ title: err.message || '更新失败', icon: 'none' });
    }
  },

  // === 菜品管理（仅管理员） ===
  showAddDish() {
    this.setData({
      showDishModal: true, isEditDish: false, editingDishId: null,
      dishForm: {
        name: '', price: '', category_id: this.data.categories[0]?.id || '',
        description: '', ingredients: '', flavor: '', image: '/images/default-dish.png'
      },
      selectedCategoryName: this.data.categories[0]?.name || '',
      selectedFlavorIndex: -1
    });
  },

  editDish(e) {
    const dish = e.currentTarget.dataset.dish;
    const cat = this.data.categories.find(c => c.id === dish.category_id);
    const fi = dish.flavor ? this.data.flavorOptions.indexOf(dish.flavor) : -1;
    this.setData({
      showDishModal: true, isEditDish: true, editingDishId: dish.id,
      dishForm: {
        name: dish.name, price: String(dish.price), category_id: dish.category_id,
        description: dish.description || '', ingredients: dish.ingredients || '',
        flavor: dish.flavor || '', image: dish.image || '/images/default-dish.png'
      },
      selectedCategoryName: cat ? cat.name : '', selectedFlavorIndex: fi
    });
  },

  async deleteDish(e) {
    const id = e.currentTarget.dataset.id;
    const m = await new Promise(r => wx.showModal({ title: '确认删除', content: '确定删除该菜品？', success: r }));
    if (!m.confirm) return;
    try { await api.delete(`/dishes/${id}`); wx.showToast({ title: '删除成功', icon: 'success' }); this.loadData(); }
    catch (err) { wx.showToast({ title: err.message || '删除失败', icon: 'none' }); }
  },

  closeDishModal() { this.setData({ showDishModal: false }); },

  // === 餐桌管理 ===
  openTableModal(e) {
    const table = e.currentTarget ? e.currentTarget.dataset.table : null;
    this.setData({
      showTableModal: true, editingTableId: table ? table.id : null,
      tableForm: { table_no: table ? table.table_no : '', capacity: table ? table.capacity : 4 }
    });
  },
  closeTableModal() { this.setData({ showTableModal: false }); },
  onTableNoInput(e) { this.setData({ 'tableForm.table_no': e.detail.value }); },
  onTableCapacityInput(e) { this.setData({ 'tableForm.capacity': parseInt(e.detail.value) || 4 }); },
  async saveTable() {
    const { table_no, capacity } = this.data.tableForm;
    if (!table_no.trim()) return wx.showToast({ title: '请输入桌号', icon: 'none' });
    try {
      if (this.data.editingTableId) {
        await api.put(`/tables/${this.data.editingTableId}`, { table_no: table_no.trim(), capacity });
      } else {
        await api.post('/tables', { table_no: table_no.trim(), capacity });
      }
      this.closeTableModal();
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.loadData();
    } catch (e) { wx.showToast({ title: e.message || '保存失败', icon: 'none' }); }
  },
  async deleteTable(e) {
    const id = e.currentTarget.dataset.id;
    const m = await new Promise(r => wx.showModal({ title: '确认删除', content: '确定删除该餐桌？', success: r }));
    if (!m.confirm) return;
    try { await api.delete(`/tables/${id}`); wx.showToast({ title: '删除成功', icon: 'success' }); this.loadData(); }
    catch (e) { wx.showToast({ title: e.message || '删除失败', icon: 'none' }); }
  },
  onDishNameInput(e) { this.setData({ 'dishForm.name': e.detail.value }); },
  onDishPriceInput(e) { this.setData({ 'dishForm.price': e.detail.value }); },
  onDescInput(e) { this.setData({ 'dishForm.description': e.detail.value }); },
  onIngredientsInput(e) { this.setData({ 'dishForm.ingredients': e.detail.value }); },
  onCategoryChange(e) {
    const cat = this.data.categories[e.detail.value];
    this.setData({ 'dishForm.category_id': cat.id, selectedCategoryName: cat.name });
  },
  onFlavorChange(e) {
    const i = e.detail.value;
    this.setData({ 'dishForm.flavor': this.data.flavorOptions[i], selectedFlavorIndex: i });
  },

  async chooseImage() {
    const r = await new Promise(r => wx.chooseImage({ count: 1, success: r, fail: () => r(null) }));
    if (!r) return;
    this.setData({ 'dishForm.image': r.tempFilePaths[0] });
    try {
      const up = await api.upload(r.tempFilePaths[0]);
      this.setData({ 'dishForm.image': api.getImageUrl(up.data.url) });
    } catch (err) { wx.showToast({ title: '图片上传失败', icon: 'none' }); }
  },

  async saveDish() {
    const { name, price, category_id } = this.data.dishForm;
    if (!name.trim()) return wx.showToast({ title: '请输入菜品名称', icon: 'none' });
    if (!price || parseFloat(price) <= 0) return wx.showToast({ title: '请输入有效价格', icon: 'none' });
    if (!category_id) return wx.showToast({ title: '请选择分类', icon: 'none' });
    try {
      const p = { ...this.data.dishForm, price: parseFloat(price) };
      if (this.data.isEditDish) await api.put(`/dishes/${this.data.editingDishId}`, p);
      else await api.post('/dishes', p);
      this.setData({ showDishModal: false });
      wx.showToast({ title: this.data.isEditDish ? '更新成功' : '添加成功', icon: 'success' });
      this.loadData();
    } catch (err) { wx.showToast({ title: err.message || '保存失败', icon: 'none' }); }
  },

  goCategory() { wx.navigateTo({ url: '/pages/category/category' }); },

  logout() {
    wx.showModal({
      title: '退出登录', content: '确定退出当前账号吗？',
      confirmText: '退出', confirmColor: '#ff4d4f',
      success: (r) => { if (r.confirm) app.logout(); }
    });
  }
});
