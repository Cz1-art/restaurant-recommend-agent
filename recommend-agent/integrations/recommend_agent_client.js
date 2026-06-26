/**
 * Scheme A: proxy /api/chat to recommend-agent when RECOMMEND_AGENT_URL is set.
 * Copy into smart-ordering-system/routes/chat.js (see integrations/README.md).
 */
const http = require('http');
const https = require('https');

async function callRecommendAgent({ baseUrl, message, history, authHeader }) {
  const url = new URL('/api/v1/recommend/chat', baseUrl.replace(/\/$/, ''));
  const body = JSON.stringify({
    message,
    history: history || [],
    auth_token: authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null,
  });
  const proto = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = proto.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(json.detail || json.message || 'agent error'));
            } else {
              resolve(json);
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('recommend-agent timeout'));
    });
    req.write(body);
    req.end();
  });
}

module.exports = { callRecommendAgent };
