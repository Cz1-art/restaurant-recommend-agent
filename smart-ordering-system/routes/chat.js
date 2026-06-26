const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Dish = require('../models/dish');
const db = require('../models/db');
const { callRecommendAgent } = require('../integrations/recommend_agent_client');

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ code: 400, message: '消息不能为空' });
    }

    if (process.env.USE_RECOMMEND_AGENT === 'true' && process.env.RECOMMEND_AGENT_URL) {
      try {
        const enableNearby =
          Boolean(req.body.enable_nearby_restaurant_search) ||
          /附近|周边|好吃|餐厅|饭店/.test(message);
        const agent = await callRecommendAgent({
          baseUrl: process.env.RECOMMEND_AGENT_URL,
          message: message.trim(),
          history,
          authHeader: req.headers.authorization,
          location: req.body.location || null,
          enableNearbyRestaurantSearch: enableNearby,
        });
        return res.json({
          code: 0,
          data: {
            reply: agent.reply,
            recommended_dishes: agent.recommended_dishes || [],
            nearby_restaurants: agent.nearby_restaurants || [],
            map_image_url: agent.map_image_url || null,
            tool_calls: agent.tool_calls || [],
            intent: agent.intent,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (agentErr) {
        console.error('recommend-agent failed, fallback:', agentErr.message);
      }
    }

    const dishes = await Dish.findAll({ status: 'on' });
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort ASC').all();

    const dishInfo = dishes.map(d =>
      `${d.name}（分类：${d.category_name || '未分类'}，价格：¥${d.price}，口味：${d.flavor || '无'}，销量：${d.sales}，描述：${d.description || '暂无'}）`
    ).join('\n');

    const categoryInfo = categories.map(c => c.name).join('、');

    const systemPrompt = `你是一个智能点餐助手，名叫"小味"。你的职责是帮助顾客推荐菜品、回答关于菜单的问题、提供点餐建议。

以下是当前餐厅的菜品信息：
分类：${categoryInfo}

菜品列表：
${dishInfo}

请注意：
1. 只推荐上述列表中存在的菜品
2. 回答要简洁友好，不要过长
3. 如果顾客询问不在这个列表中的菜品，请说明当前没有该菜品
4. 可以根据顾客的口味偏好推荐菜品
5. 如果顾客没有明确需求，可以主动询问口味偏好`;

    const aiResponse = await callAiApi(systemPrompt, message, history);

    res.json({
      code: 0,
      data: {
        reply: aiResponse,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('AI聊天错误:', err);
    res.status(500).json({ code: 500, message: err.message || 'AI服务暂时不可用，请稍后重试' });
  }
});

async function callAiApi(systemPrompt, userMessage, history) {
  const https = require('https');
  const http = require('http');

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  for (const msg of history) {
    messages.push(msg);
  }

  messages.push({ role: 'user', content: userMessage });

  const apiUrl = process.env.AI_API_URL || 'https://api.siliconflow.cn/v1/chat/completions';
  const apiKey = process.env.AI_API_KEY || '';
  const model = process.env.AI_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

  if (!apiKey) {
    return generateRuleBasedReply(userMessage, systemPrompt);
  }

  const body = JSON.stringify({
    model,
    messages,
    max_tokens: 500,
    temperature: 0.7
  });

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(apiUrl);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const proto = parsedUrl.protocol === 'https:' ? https : http;
    const req = proto.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0] && json.choices[0].message) {
            resolve(json.choices[0].message.content);
          } else if (json.error) {
            reject(new Error(json.error.message || 'AI API返回错误'));
          } else {
            reject(new Error('AI API返回格式异常'));
          }
        } catch (e) {
          reject(new Error('解析AI响应失败'));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('AI请求超时'));
    });
    req.write(body);
    req.end();
  });
}

function generateRuleBasedReply(userMessage, systemPrompt) {
  const msg = userMessage.toLowerCase();
  const dishLines = systemPrompt.split('菜品列表：\n')[1]?.split('\n').filter(l => l.trim()) || [];

  if (msg.includes('推荐') || msg.includes('有什么') || msg.includes('吃什么')) {
    const shuffled = dishLines.sort(() => Math.random() - 0.5).slice(0, 3);
    const recommendations = shuffled.map(line => {
      const nameMatch = line.match(/^(.+?)（/);
      return nameMatch ? nameMatch[1] : line.substring(0, 10);
    });
    return `为您推荐以下菜品：\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n您想要了解哪道菜的详细信息吗？`;
  }

  if (msg.includes('辣') || msg.includes('麻辣')) {
    const spicyDishes = dishLines.filter(l => l.includes('辣') || l.includes('麻辣'));
    if (spicyDishes.length > 0) {
      const names = spicyDishes.map(l => l.match(/^(.+?)（/)?.[1] || '').filter(Boolean);
      return `喜欢辣味吗？为您推荐：\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;
    }
    return '暂无辣味菜品，您可以看看其他口味的菜品哦~';
  }

  if (msg.includes('便宜') || msg.includes('实惠') || msg.includes('性价比')) {
    return '我们有很多实惠的菜品，推荐您看看菜单中的精选套餐，性价比很高哦！';
  }

  if (msg.includes('你好') || msg.includes('您好') || msg.includes('hi') || msg.includes('hello')) {
    return '您好！我是智能点餐助手小味，很高兴为您服务！\n\n我可以帮您：\n1. 推荐菜品\n2. 查询菜品信息\n3. 根据口味推荐\n\n请问您想吃什么口味的菜呢？';
  }

  for (const line of dishLines) {
    const nameMatch = line.match(/^(.+?)（/);
    if (nameMatch && msg.includes(nameMatch[1].toLowerCase())) {
      return `关于${nameMatch[1]}：\n${line}\n\n要不要加入购物车呢？`;
    }
  }

  return '我是智能点餐助手小味，可以帮您推荐菜品和回答菜单相关问题。请问您有什么需要？比如：\n1. "推荐几道菜"\n2. "有什么辣的菜"\n3. "有什么实惠的菜"';
}

module.exports = router;
