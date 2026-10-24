const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const telegramBot = require('./telegram-bot');

const cloudflaredPath = path.join(__dirname, 'cloudflared.exe');

if (!fs.existsSync(cloudflaredPath)) {
  console.error('❌ cloudflared.exe topilmadi!');
  process.exit(1);
}

let tunnelProcess = null;
let isStopping = false;
let restartAttempts = 0;

function startTunnel() {
  if (isStopping) return;

  console.log('⚡ [Cloudflare Tunnel] Ulanish boshlanmoqda (PORT: 5000)...');

  tunnelProcess = spawn(cloudflaredPath, ['tunnel', '--url', 'http://localhost:5000'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let foundUrl = false;

  function handleOutput(data) {
    const text = data.toString();
    process.stdout.write(text);

    if (!foundUrl) {
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match) {
        foundUrl = true;
        restartAttempts = 0;
        const publicUrl = match[0];
        console.log('\n======================================================');
        console.log(`🎉 JONLI HTTPS SAYT MANZILI TAYYOR: ${publicUrl}`);
        console.log(`🤖 Telegram Botga yangi havola avtomatik biriktirilmoqda...`);
        console.log('======================================================\n');
        
        telegramBot.updateSiteUrl(publicUrl);
      }
    }
  }

  tunnelProcess.stdout.on('data', handleOutput);
  tunnelProcess.stderr.on('data', handleOutput);

  tunnelProcess.on('error', (err) => {
    console.error('⚠️ [Cloudflare xatosi]:', err.message);
  });

  tunnelProcess.on('close', (code) => {
    tunnelProcess = null;
    if (isStopping) return;

    restartAttempts++;
    const delay = Math.min(restartAttempts * 2000, 10000);
    console.warn(`\n⚠️ Tunnel uzildi (kod: ${code}). ${delay / 1000} soniyadan keyin avtomatik qayta ulanadi...\n`);
    setTimeout(startTunnel, delay);
  });
}

// Boshlash
startTunnel();

// Xavfsiz to'xtatish
function cleanup() {
  isStopping = true;
  if (tunnelProcess) {
    try {
      tunnelProcess.kill();
    } catch (e) {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
