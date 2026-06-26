// pages/login/login.js
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    isRegister: false,
    username: '',
    password: '',
    nickname: ''
  },

  onLoad() {
    // 如果已登录则跳转首页
    if (app.globalData.isLoggedIn) {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  toggleMode() {
    this.setData({ isRegister: !this.data.isRegister });
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  async submit() {
    const { username, password, nickname, isRegister } = this.data;

    if (!username.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }
    if (!password || password.length < 6) {
      wx.showToast({ title: '密码不能少于6位', icon: 'none' });
      return;
    }

    try {
      let res;
      if (isRegister) {
        res = await api.post('/users/register', {
          username: username.trim(),
          password,
          nickname: nickname.trim() || username.trim()
        });
      } else {
        res = await api.post('/users/login', {
          username: username.trim(),
          password
        });
      }

      // 保存token和用户信息
      wx.setStorageSync('token', res.data.token);
      wx.setStorageSync('userInfo', res.data.user);
      app.login(res.data.user);

      wx.showToast({ title: isRegister ? '注册成功' : '登录成功', icon: 'success' });

      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 1000);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  }
});
