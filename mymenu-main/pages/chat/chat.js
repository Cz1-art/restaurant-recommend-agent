// pages/chat/chat.js
const api = require('../../utils/api');

Page({
  data: {
    messages: [],
    inputText: '',
    scrollToView: '',
    loading: false,
    sending: false
  },

  onLoad() {
    // 初始欢迎消息
    this.setData({
      messages: [{
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是智能点餐助手小味，可以帮您推荐菜品、查询菜单信息。请问您想吃什么口味的菜呢？',
        time: this.formatTime(new Date())
      }]
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  onInputChange(e) {
    this.setData({ inputText: e.detail.value });
  },

  formatTime(date) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  },

  async sendMessage() {
    const text = this.data.inputText.trim();
    if (!text || this.data.sending) return;

    const userMsg = {
      id: 'user_' + Date.now(),
      role: 'user',
      content: text,
      time: this.formatTime(new Date())
    };

    const messages = [...this.data.messages, userMsg];
    this.setData({
      messages,
      inputText: '',
      sending: true
    });

    this.scrollToBottom();

    try {
      // 构建历史消息（最近10条）
      const history = messages
        .filter(m => m.id !== 'welcome')
        .slice(-11, -1) // 取发送前的消息作为历史
        .map(m => ({ role: m.role, content: m.content }));

      const res = await api.post('/chat', { message: text, history });

      const aiMsg = {
        id: 'ai_' + Date.now(),
        role: 'assistant',
        content: res.data.reply,
        time: this.formatTime(new Date())
      };

      this.setData({
        messages: [...this.data.messages, aiMsg],
        sending: false
      });
    } catch (err) {
      const errMsg = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: '抱歉，我暂时无法回复，请稍后再试。',
        time: this.formatTime(new Date())
      };
      this.setData({
        messages: [...this.data.messages, errMsg],
        sending: false
      });
    }

    this.scrollToBottom();
  },

  scrollToBottom() {
    setTimeout(() => {
      this.setData({ scrollToView: 'msg-bottom' });
    }, 100);
  },

  // 快捷提问
  quickAsk(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({ inputText: question }, () => {
      this.sendMessage();
    });
  },

  // 加入购物车（从AI推荐中点击）
  async addFromChat(e) {
    // 此功能可扩展，暂不实现
  }
});
