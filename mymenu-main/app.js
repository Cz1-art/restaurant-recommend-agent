// app.js
const api = require('./utils/api');

App({
  onLaunch() {
    // 检查登录状态
    this.checkLogin();
  },

  checkLogin() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (token && userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
    } else {
      this.globalData.isLoggedIn = false;
    }
  },

  // 登录
  login(userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('userInfo', userInfo);
  },

  // 退出登录
  logout() {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.redirectTo({ url: '/pages/login/login' });
  },

  // 检查是否登录，未登录跳转登录页
  requireLogin() {
    if (!this.globalData.isLoggedIn) {
      wx.redirectTo({ url: '/pages/login/login' });
      return false;
    }
    return true;
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    selectedTable: null // { id, table_no }
  },

  // 选桌
  setTable(table) {
    this.globalData.selectedTable = table;
    wx.setStorageSync('selectedTable', table);
  },

  getTable() {
    if (this.globalData.selectedTable) return this.globalData.selectedTable;
    const t = wx.getStorageSync('selectedTable');
    if (t) this.globalData.selectedTable = t;
    return t || null;
  },

  clearTable() {
    this.globalData.selectedTable = null;
    wx.removeStorageSync('selectedTable');
  }
});
