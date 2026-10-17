process.on('uncaughtException', (err) => {
  console.error('⚠️ [Server UncaughtException]:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Server UnhandledRejection]:', reason);
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { seed } = require('./data/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Ensure uploads dir
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Static folders
app.use('/uploads', express.static(uploadsPath));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    name: 'FC Mobile Bazar 24/7 API'
  });
});

// Telegram bot control endpoints
const telegramBot = require('./telegram-bot');

app.get('/api/bot/status', (req, res) => {
  res.json({
    botUsername: 'fcmobil27_bot',
    siteUrl: telegramBot.getSiteUrl(),
    status: 'online'
  });
});

app.post('/api/bot/url', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL kiritilishi shart' });
  telegramBot.updateSiteUrl(url);
  res.json({ success: true, url: telegramBot.getSiteUrl() });
});

// Single Page Application route fallback (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Serverda ichki xatolik yuz berdi' });
});

// Start server
async function start() {
  try {
    // Run seed if needed
    await seed();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(`⚽ FC MOBILE BAZAR — 24/7 ISHGA TUSHDI!`);
      console.log(`🌐 Server manzili: http://localhost:${PORT}`);
      console.log(`🤖 Telegram Bot: @fcmobil27_bot (Faol)`);
      console.log(`🛡️  Garant tizimi va barcha API xizmatlari tayyor`);
      console.log(`===============================================`);

      // Start Telegram Bot Polling
      telegramBot.startPolling();
    });
  } catch (err) {
    console.error('Serverni ishga tushirishda xato:', err);
  }
}

start();
