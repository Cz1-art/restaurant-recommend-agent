// API请求工具 - 封装wx.request
const BASE_URL = 'http://localhost:3000/api';
const IMAGE_BASE = 'http://localhost:3000';

// 获取存储的token
function getToken() {
  return wx.getStorageSync('token') || '';
}

// 转换图片路径为完整URL
function getImageUrl(path) {
  if (!path) return '/images/default-dish.png';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads/')) return `${IMAGE_BASE}${path}`;
  return path; // 本地资源如 /images/xxx.png
}

// 通用请求方法
function request(options) {
  return new Promise((resolve, reject) => {
    const { url, method = 'GET', data, header = {} } = options;

    // 自动添加token
    const token = getToken();
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          if (res.data.code === 0) {
            resolve(res.data);
          } else {
            reject(res.data);
          }
        } else if (res.statusCode === 401) {
          // token过期或无效，跳转登录
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.showToast({ title: '请先登录', icon: 'none' });
          setTimeout(() => {
            wx.redirectTo({ url: '/pages/login/login' });
          }, 1000);
          reject(res.data);
        } else {
          reject(res.data || { code: res.statusCode, message: '请求失败' });
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject({ code: -1, message: '网络异常' });
      }
    });
  });
}

// 便捷方法
const api = {
  get(url, data) {
    return request({ url, method: 'GET', data });
  },
  post(url, data) {
    return request({ url, method: 'POST', data });
  },
  put(url, data) {
    return request({ url, method: 'PUT', data });
  },
  delete(url, data) {
    return request({ url, method: 'DELETE', data });
  },

  // 转换图片路径
  getImageUrl,

  // 文件上传
  upload(filePath) {
    return new Promise((resolve, reject) => {
      const token = getToken();
      wx.uploadFile({
        url: `${BASE_URL}/upload`,
        filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          const data = JSON.parse(res.data);
          if (data.code === 0) {
            resolve(data);
          } else {
            reject(data);
          }
        },
        fail: (err) => {
          reject({ code: -1, message: '上传失败' });
        }
      });
    });
  }
};

module.exports = api;
