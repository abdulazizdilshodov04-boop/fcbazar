const http = require('http');
const path = require('path');
const fs = require('fs');
const telegramBot = require('./telegram-bot');

function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = http.createServer();
    tester.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    tester.once('listening', () => {
      tester.close();
      resolve(false);
    });
    tester.listen(port);
  });
}

async function main() {
  console.log('=====================================================');
  console.log('  ⚽ FC BAZAR - SERVER VA TELEGRAM BOT (ONLINE 24/7)');
  console.log('=====================================================\n');

  // 1. Port 5000 tekshiruvi
  const portInUse = await isPortInUse(5000);
  if (!portInUse) {
    console.log('📦 [1/2] Server va Telegram bot ishga tushirilmoqda...');
    require('./server.js');
    await new Promise((r) => setTimeout(r, 2000));
  } else {
    console.log('✅ [1/2] Server 5000-portda allaqachon faol ishlamoqda');
    try {
      telegramBot.startPolling();
    } catch (e) {}
  }

  // 2. Cloudflare Tunnel ulanishi
  console.log('🌐 [2/2] Dunyo bo\'ylab Cloudflare HTTPS Tunneli ulanmoqda...\n');
  require('./run-tunnel.js');
}

main().catch(console.error);
