const express = require('express');
const webpush = require('web-push');
const path = require('path');

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

// Store subscriptions
let subscriptions = [];

// Charlie's messages for push notifications
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
];

// API endpoint to save subscription
app.post('/api/subscribe', (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  console.log('New subscription added. Total:', subscriptions.length);
  res.json({ success: true });
});

// API endpoint to send a test notification
app.post('/api/send-test', async (req, res) => {
  const message = charlieMessages[Math.floor(Math.random() * charlieMessages.length)];
  
  const payload = JSON.stringify({
    title: 'Charlie',
    body: message,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'charlie-msg',
    data: { url: '/' }
  });

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err) {
      console.error('Push failed:', err.statusCode);
    }
  }
  
  res.json({ success: true, sent, message });
});

// Auto-push: check every minute, send if no activity for set interval
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
  if (elapsed >= autoPushInterval && subscriptions.length > 0) {
    const message = charlieMessages[Math.floor(Math.random() * charlieMessages.length)];
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
        console.log('Auto-push sent:', message);
      } catch (err) {
        console.error('Auto-push failed:', err.statusCode);
      }
    }
    lastActivity = Date.now(); // Reset so we don't spam
  }
}, 60000);

app.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Charlie Push Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}`);
});
