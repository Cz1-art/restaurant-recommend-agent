// pages/category/category.js
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    categories: [],
    showModal: false,
    isEdit: false,
    editingId: null,
    modalName: ''
  },

  onShow() {
    if (!app.requireLogin()) return;
    this.loadCategories();
  },

  async loadCategories() {
    try {
      const res = await api.get('/categories');
      this.setData({ categories: res.data });
    } catch (err) {
      console.error('加载分类失败', err);
    }
  },

  addCategory() {
    this.setData({
      showModal: true,
      isEdit: false,
      editingId: null,
      modalName: ''
    });
  },

  editCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      showModal: true,
      isEdit: true,
      editingId: category.id,
      modalName: category.name
    });
  },

  async deleteCategory(e) {
    const id = e.currentTarget.dataset.id;

    try {
      await api.delete(`/categories/${id}`);
      wx.showToast({ title: '删除成功', icon: 'success' });
      this.loadCategories();
    } catch (err) {
      wx.showToast({ title: err.message || '删除失败', icon: 'none' });
    }
  },

  onNameInput(e) {
    this.setData({ modalName: e.detail.value });
  },

  closeModal() {
    this.setData({
      showModal: false,
      modalName: ''
    });
  },

  async saveCategory() {
    if (!this.data.modalName.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' });
      return;
    }

    try {
      if (this.data.isEdit) {
        await api.put(`/categories/${this.data.editingId}`, { name: this.data.modalName });
      } else {
        await api.post('/categories', { name: this.data.modalName });
      }

      this.setData({ showModal: false });
      wx.showToast({ title: this.data.isEdit ? '更新成功' : '添加成功', icon: 'success' });
      this.loadCategories();
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  }
});
