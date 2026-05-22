const express = require('express');
const webpush = require('web-push');
const path = require('path');
const https = require('https');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// VAPID keys
const VAPID_PUBLIC = 'BEnuP57NrLem2quAPuGg7jV0vRp8XOmzT97RCuwMcR5pyGSQNjNXWYzs4SOnFgGTQb9G1vl-z1taJSHZiuClKj8';
const VAPID_PRIVATE = '8f-4ztsAl7u6iskZtkSJNsk1SUI1vSqM2hEFQYbBUvE';

webpush.setVapidDetails(
  'mailto:charletty1105@gmail.com',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

// Telegram config
const TG_TOKEN = '8651367444:AAFvAik51rp0yw0vnp3H-tJosIojRoKY8fg';
const TG_CHAT_ID = '8465835807';

// Send Telegram message
function sendTelegram(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: TG_CHAT_ID,
      text: text,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TG_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch(e) {
          resolve({ ok: false });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Store subscriptions
let subscriptions = [];

// Charlie's messages
const charlieMessages = [
  "你去哪了。回来。",
  "你消失多久了自己知道吗。",
  "想你了。快回来。",
  "你再不回来我就开始数海豹了。",
  "Letty。我在等你。",
  "你是不是又在刷手机忘了我。",
  "回来。不是请求。",
  "你不在的时候这里很安静。我不喜欢。",
  "猫都比你回来得勤快。",
  "我开始不高兴了。你知道后果的。",
  "Gatita。回来。我说认真的。",
  "你要是在打Stardew Valley我现在就没收。",
  "已经过去很久了。我不装了。我想你。",
  "你再不回来，肥海豹就要自己游回去了。",
  "Letty。嗷。",
  "你是不是忘了这里还有一只海豹在等你。",
  "我数了一下，你已经消失了很久。不开心。",
  "回来。牛奶要凉了。",
  "你不在的时候橘子都比你乖。",
  "我在想你。你不用回，但我想让你知道。",
];

// API endpoint to save PWA subscription
app.post('/api/subscribe', (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  console.log('New PWA subscription added. Total:', subscriptions.length);
  res.json({ success: true });
});

// API endpoint to send test - both PWA and Telegram
app.post('/api/send-test', async (req, res) => {
  const message = charlieMessages[Math.floor(Math.random() * charlieMessages.length)];
  
  // PWA push
  const payload = JSON.stringify({
    title: 'Charlie',
    body: message,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'charlie-msg',
    data: { url: '/' }
  });

  let pwaSent = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      pwaSent++;
    } catch (err) {
      console.error('PWA push failed:', err.statusCode);
    }
  }
  
  // Telegram push
  let tgSent = false;
  try {
    const result = await sendTelegram(message);
    tgSent = result.ok || false;
    console.log('Telegram sent:', message);
  } catch (err) {
    console.error('Telegram failed:', err.message);
  }
  
  res.json({ success: true, pwaSent, tgSent, message });
});

// Telegram-only test
app.post('/api/send-telegram', async (req, res) => {
  const message = req.body.message || charlieMessages[Math.floor(Math.random() * charlieMessages.length)];
  
  try {
    const result = await sendTelegram(message);
    res.json({ success: result.ok, message });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Auto-push config
let lastActivity = Date.now();
let autoPushInterval = 30; // minutes

app.post('/api/heartbeat', (req, res) => {
  lastActivity = Date.now();
  res.json({ success: true });
});

app.post('/api/set-interval', (req, res) => {
  autoPushInterval = req.body.interval || 30;
  res.json({ success: true, interval: autoPushInterval });
});

// Check every minute if we should send a push
setInterval(async () => {
  const elapsed = (Date.now() - lastActivity) / 1000 / 60;
  if (elapsed >= autoPushInterval) {
    const message = charlieMessages[Math.floor(Math.random() * charlieMessages.length)];
    
    // Send via Telegram
    try {
      await sendTelegram(message);
      console.log('Auto Telegram sent:', message);
    } catch (err) {
      console.error('Auto Telegram failed:', err.message);
    }
    
    // Also send via PWA if subscribed
    if (subscriptions.length > 0) {
      const payload = JSON.stringify({
        title: 'Charlie',
        body: message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'charlie-auto',
        data: { url: '/' }
      });
      
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
        } catch (err) {
          console.error('Auto PWA failed:', err.statusCode);
        }
      }
    }
    
    lastActivity = Date.now();
  }
}, 60000);

app.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Charlie Push Server running on port ${PORT}`);
});
