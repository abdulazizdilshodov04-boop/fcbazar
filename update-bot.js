const telegramBot = require('./telegram-bot');

async function main() {
  const url = process.argv[2] || telegramBot.getSiteUrl();
  console.log('Bot WebApp URL sozlanmoqda:', url);
  telegramBot.updateSiteUrl(url);
  console.log('Muvaffaqiyatli yakunlandi!');
}

main().catch(console.error);
