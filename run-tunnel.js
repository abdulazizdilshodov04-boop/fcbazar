const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const telegramBot = require('./telegram-bot');

const cloudflaredPath = path.join(__dirname, 'cloudflared.exe');

if (!fs.existsSync(cloudflaredPath)) {
  console.log('cloudflared.exe topilmadi.');
  process.exit(1);
}

console.log('⚡ Cloudflare HTTPS Tunneli ishga tushirilmoqda...');

const tunnel = spawn(cloudflaredPath, ['tunnel', '--url', 'http://localhost:5000'], {
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
      const publicUrl = match[0];
      console.log('\n======================================================');
      console.log(`🎉 JONLI HTTPS SAYT MANZILI TAYYOR: ${publicUrl}`);
      console.log(`🤖 Telegram Botga havola yuborilmoqda...`);
      console.log('======================================================\n');
      
      telegramBot.updateSiteUrl(publicUrl);
    }
  }
}

tunnel.stdout.on('data', handleOutput);
tunnel.stderr.on('data', handleOutput);

tunnel.on('close', (code) => {
  console.log(`Tunnel jarayoni tugadi, kod: ${code}`);
});

process.on('SIGINT', () => {
  tunnel.kill();
  process.exit();
});
