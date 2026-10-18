const path = require('path');
const fs = require('fs');

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN || '8996467750:AAFyP-tELXWzLJmjZc5kKVe_cOvKdADKKYo';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Helper to get current site URL
function getSiteUrl() {
  if (process.env.WEB_APP_URL) {
    return process.env.WEB_APP_URL.trim();
  }
  // Check if config.json exists
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (conf.siteUrl) return conf.siteUrl.trim();
    } catch (e) {}
  }
  return 'http://localhost:5000';
}

// Helper to save site URL
function setSiteUrl(url) {
  const configPath = path.join(__dirname, 'config.json');
  let conf = {};
  if (fs.existsSync(configPath)) {
    try { conf = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
  }
  conf.siteUrl = url;
  fs.writeFileSync(configPath, JSON.stringify(conf, null, 2), 'utf8');
}

// Database helper
let db = null;
try {
  db = require('./data/db');
} catch (e) {
  console.error('DB load error in bot:', e);
}

// In-memory cache for Telegram logo file_id to eliminate external download lag
let cachedLogoFileId = null;

// Telegram API request helper with timeout protection
async function callApi(method, data = {}) {
  try {
    const res = await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API xatoligi [${method}]:`, err.message);
    return { ok: false, error: err.message };
  }
}

// Build keyboard buttons
function buildKeyboard() {
  const siteUrl = getSiteUrl();
  const isHttps = siteUrl.startsWith('https://');

  const inlineKeyboard = [];

  if (isHttps) {
    inlineKeyboard.push([
      {
        text: '🚀 FC Bazarni ochish (Web App)',
        web_app: { url: siteUrl }
      }
    ]);
    inlineKeyboard.push([
      {
        text: '🌐 Brauzerda ochish',
        url: siteUrl
      }
    ]);
  } else {
    inlineKeyboard.push([
      {
        text: '🌐 Saytga kirish (Brauzer)',
        url: siteUrl
      }
    ]);
  }

  inlineKeyboard.push([
    { text: '🛡️ Garant qanday ishlaydi?', callback_data: 'garant' },
    { text: '📊 Bozor statistikasi', callback_data: 'stats' }
  ]);

  inlineKeyboard.push([
    { text: '📞 Admin & Qo\'llab-quvvatlash', callback_data: 'support' },
    { text: '🔄 Yangilash', callback_data: 'refresh' }
  ]);

  return { inline_keyboard: inlineKeyboard };
}

// Welcome message text
function getWelcomeText(userName = 'Qadrdon do\'stim') {
  const siteUrl = getSiteUrl();
  const isHttps = siteUrl.startsWith('https://');

  return `⚽ <b>Assalomu alaykum, ${escapeHtml(userName)}!</b>\n` +
    `<b>FC MOBILE BAZAR — Rasmiy Telegram Botiga xush kelibsiz!</b>\n\n` +
    `Bu yerda siz FC Mobile (FIFA Mobile) o'yini akkauntlarini <b>24/7 xavfsiz va ishonchli Garant tizimi</b> orqali sotib olishingiz yoki sotishingiz mumkin.\n\n` +
    `✨ <b>Asosiy afzalliklar:</b>\n` +
    `• 🛡️ <b>100% Xavfsiz Garant</b> — mablag'ingiz to'liq himoyada\n` +
    `• ⚡ <b>Tezkor To'lov</b> — Payme, Click, Uzum Bank\n` +
    `• 🎮 <b>Eng sara akkauntlar</b> — arzon va sifatli tanlov\n` +
    `• 🤝 <b>Jonli Bitim Xonasi</b> — xavfsiz chat va nazorat\n` +
    `• 💎 Yangi foydalanuvchilarga <b>100,000 so'm</b> bonus balansi!\n\n` +
    (isHttps 
      ? `👇 <i>Saytni ochish uchun pastdagi tugmani bosing:</i>`
      : `🌐 <i>Sayt manzili:</i> ${siteUrl}\n<i>(Telegram ichida ochilishi uchun HTTPS manzili kerak)</i>`);
}

// Garant text
function getGarantText() {
  return `🛡️ <b>GARANT (ESCROW) TIZIMI QANDAY ISHLAYDI?</b>\n\n` +
    `FC Mobile Bazar platformasida barcha bitimlar 100% himoyalangan:\n\n` +
    `1️⃣ <b>Mablag'ni muzlatish:</b>\n` +
    `Xaridor hisobini to'ldiradi va e'londagi "Sotib olish" tugmasini bosadi. Pul sotuvchiga to'g'ridan-to'g'ri berilmaydi, balki platforma Garant hisobida xavfsiz muzlatiladi.\n\n` +
    `2️⃣ <b>Ma'lumotlarni topshirish:</b>\n` +
    `Maxfiy bitim xonasi ochiladi. Sotuvchi o'yin akkaunti login va parolini chatda taqdim etadi.\n\n` +
    `3️⃣ <b>Akkauntni tekshirish:</b>\n` +
    `Xaridor o'yinga kirib akkaunt tarkibi va OVR'ini tekshiradi, o'zining parolini qo'yadi va "Bitimni tasdiqlash" tugmasini bosadi.\n\n` +
    `4️⃣ <b>Muvaffaqiyatli yakun:</b>\n` +
    `Xaridor tasdiqlaganidan keyingina pul sotuvchining hisobiga o'tkaziladi.\n\n` +
    `⚖️ <b>Agar muammo bo'lsa:</b>\n` +
    `Istalgan tomon "Arbitraj" tugmasini bosishi mumkin. Garant admini darhol chatga qo'shiladi va nizoni adolatli hal qiladi. Pul xaridorga qaytariladi!`;
}

// Statistics text
function getStatsText() {
  let userCount = 12;
  let listingCount = 6;
  let dealCount = 4;

  if (db && typeof db.read === 'function') {
    try {
      const data = db.read();
      if (data.users) userCount = data.users.length;
      if (data.listings) listingCount = data.listings.filter(l => l.status === 'active').length;
      if (data.deals) dealCount = data.deals.length;
    } catch (e) {}
  }

  return `📊 <b>FC MOBILE BAZAR — JONLI STATISTIKA:</b>\n\n` +
    `👥 <b>Ro'yxatdan o'tganlar:</b> ${userCount} nafar\n` +
    `⚽ <b>Sotuvdagi faol akkauntlar:</b> ${listingCount} ta\n` +
    `🤝 <b>Amalga oshirilgan bitimlar:</b> ${dealCount} ta\n` +
    `🛡️ <b>Garant xavfsizlik darajasi:</b> 100%\n` +
    `⚡ <b>Server va Bot holati:</b> 24/7 Onlayn`;
}

// Support text
function getSupportText() {
  return `📞 <b>ADMIN VA QO'LLAB-QUVVATLASH:</b>\n\n` +
    `Savollaringiz, takliflaringiz yoki Garant arbitraji bo'yicha murojaat qilishingiz mumkin:\n\n` +
    `👤 <b>Bosh Garant & Moderator:</b> @abdulazizdilshodov\n` +
    `⏰ <b>Ish vaqti:</b> 24/7 Kun-u tun\n` +
    `🛡️ <i>Xavfsizligingiz bizning oliy maqsadimiz!</i>`;
}

// Support keyboard with direct link to admin
function getSupportKeyboard() {
  const siteUrl = getSiteUrl();
  const isHttps = siteUrl.startsWith('https://');
  const buttons = [
    [
      { text: '💬 Admin bilan bog\'lanish (@abdulazizdilshodov)', url: 'https://t.me/abdulazizdilshodov' }
    ]
  ];

  if (isHttps) {
    buttons.push([
      { text: '🚀 FC Bazarni ochish (Web App)', web_app: { url: siteUrl } }
    ]);
  } else {
    buttons.push([
      { text: '🌐 Saytga kirish', url: siteUrl }
    ]);
  }

  buttons.push([
    { text: '⬅️ Asosiy menyu', callback_data: 'refresh' }
  ]);

  return { inline_keyboard: buttons };
}

// Submenu keyboard with quick return to main menu or support
function buildSubKeyboard() {
  const siteUrl = getSiteUrl();
  const isHttps = siteUrl.startsWith('https://');
  const buttons = [];

  if (isHttps) {
    buttons.push([
      { text: '🚀 FC Bazarni ochish (Web App)', web_app: { url: siteUrl } }
    ]);
  } else {
    buttons.push([
      { text: '🌐 Saytga kirish', url: siteUrl }
    ]);
  }

  buttons.push([
    { text: '📞 Admin & Qo\'llab-quvvatlash', callback_data: 'support' },
    { text: '⬅️ Asosiy menyu', callback_data: 'refresh' }
  ]);

  return { inline_keyboard: buttons };
}

// Universal message updater: works for both photo messages (caption) and text messages
async function updateBotMessage(cq, text, replyMarkup) {
  if (!cq || !cq.message) return;
  const chatId = cq.message.chat.id;
  const messageId = cq.message.message_id;
  const isPhoto = Boolean(cq.message.photo && cq.message.photo.length > 0);

  // If the message has a photo, edit caption
  if (isPhoto) {
    const capRes = await callApi('editMessageCaption', {
      chat_id: chatId,
      message_id: messageId,
      caption: text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });
    if (capRes.ok) return capRes;
  }

  // Otherwise try editing message text
  const textRes = await callApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup
  });

  // If both failed, send fresh message so the user ALWAYS gets the response
  if (!textRes.ok) {
    return await callApi('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });
  }
  return textRes;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Configure Menu Button and Bot Commands
async function setupBotConfig() {
  const siteUrl = getSiteUrl();
  const isHttps = siteUrl.startsWith('https://');

  // Register commands
  await callApi('setMyCommands', {
    commands: [
      { command: 'start', description: '⚽ Bosh menyu va saytni ochish' },
      { command: 'sayt', description: '🌐 FC Mobile Bazar saytiga kirish' },
      { command: 'garant', description: '🛡️ Garant tizimi haqida' },
      { command: 'statistika', description: '📊 Bozor statistikasi' },
      { command: 'yordam', description: '📞 Admin va yordam' }
    ]
  });

  // Set chat menu button (persistent Web App button on bottom left)
  if (isHttps) {
    const res = await callApi('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: '⚽ Saytni ochish',
        web_app: { url: siteUrl }
      }
    });
    console.log('✅ Telegram WebApp menyu tugmasi sozlandi:', res.ok ? 'OK' : res.description);
  } else {
    await callApi('setChatMenuButton', {
      menu_button: {
        type: 'default'
      }
    });
  }
}

// Handle updates
async function handleUpdate(update) {
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const userName = msg.from.first_name || msg.from.username || 'Foydalanuvchi';

    if (text.startsWith('/start') || text.startsWith('/sayt')) {
      const siteUrl = getSiteUrl();
      const photoPayload = cachedLogoFileId || `${siteUrl}/assets/logo.jpg`;

      const photoRes = await callApi('sendPhoto', {
        chat_id: chatId,
        photo: photoPayload,
        caption: getWelcomeText(userName),
        parse_mode: 'HTML',
        reply_markup: buildKeyboard()
      });

      if (photoRes.ok && photoRes.result && photoRes.result.photo && photoRes.result.photo.length > 0) {
        cachedLogoFileId = photoRes.result.photo[photoRes.result.photo.length - 1].file_id;
      } else if (!photoRes.ok) {
        // Fallback to text message if photo fails
        await callApi('sendMessage', {
          chat_id: chatId,
          text: getWelcomeText(userName),
          parse_mode: 'HTML',
          reply_markup: buildKeyboard()
        });
      }
      return;
    }

    if (text.startsWith('/garant')) {
      await callApi('sendMessage', {
        chat_id: chatId,
        text: getGarantText(),
        parse_mode: 'HTML',
        reply_markup: buildSubKeyboard()
      });
      return;
    }

    if (text.startsWith('/statistika')) {
      await callApi('sendMessage', {
        chat_id: chatId,
        text: getStatsText(),
        parse_mode: 'HTML',
        reply_markup: buildSubKeyboard()
      });
      return;
    }

    if (text.startsWith('/yordam') || text.startsWith('/help')) {
      await callApi('sendMessage', {
        chat_id: chatId,
        text: getSupportText(),
        parse_mode: 'HTML',
        reply_markup: getSupportKeyboard()
      });
      return;
    }

    // Default response
    await callApi('sendMessage', {
      chat_id: chatId,
      text: getWelcomeText(userName),
      parse_mode: 'HTML',
      reply_markup: buildKeyboard()
    });
  } else if (update.callback_query) {
    const cq = update.callback_query;
    const data = cq.data;

    // Acknowledge immediately to stop loading indicator on client
    callApi('answerCallbackQuery', { callback_query_id: cq.id }).catch(() => {});

    if (data === 'garant') {
      await updateBotMessage(cq, getGarantText(), buildSubKeyboard());
    } else if (data === 'stats') {
      await updateBotMessage(cq, getStatsText(), buildSubKeyboard());
    } else if (data === 'support') {
      await updateBotMessage(cq, getSupportText(), getSupportKeyboard());
    } else if (data === 'refresh') {
      const userName = cq.from.first_name || cq.from.username || 'Foydalanuvchi';
      await updateBotMessage(cq, getWelcomeText(userName), buildKeyboard());
    }
  }
}

// Keep-Alive to prevent Render free instance from hibernating
let keepAliveTimer = null;
function startKeepAlive() {
  if (keepAliveTimer) return;
  keepAliveTimer = setInterval(async () => {
    try {
      const siteUrl = getSiteUrl();
      if (siteUrl && siteUrl.startsWith('https://')) {
        await fetch(`${siteUrl}/api/health`, {
          signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
        });
      }
    } catch (e) {}
  }, 8 * 60 * 1000); // Har 8 daqiqada
}

// Long polling loop
let isRunning = false;
async function startPolling() {
  if (isRunning) return;
  isRunning = true;

  console.log('🤖 Telegram Bot 24/7 Polling rejimida ishga tushmoqda...');
  
  const me = await callApi('getMe');
  if (!me.ok) {
    console.error('❌ Botga ulanib bo\'lmadi:', me.description || me.error);
    isRunning = false;
    return;
  }

  console.log(`✅ Telegram Bot ulandi: @${me.result.username} (${me.result.first_name})`);
  await setupBotConfig();
  startKeepAlive();

  let offset = 0;
  while (isRunning) {
    try {
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=25`, {
        signal: AbortSignal.timeout ? AbortSignal.timeout(35000) : undefined
      });
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          // Asynchronous parallel processing - no blocking between requests!
          handleUpdate(update).catch(err => console.error('Bot update xatoligi:', err.message));
        }
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.warn('Bot polling uzilishi (qayta ulanmoqda...):', err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

function updateSiteUrl(newUrl) {
  setSiteUrl(newUrl);
  process.env.WEB_APP_URL = newUrl;
  setupBotConfig().catch(console.error);
  console.log(`🌐 Botdagi sayt manzili yangilandi: ${newUrl}`);
}

module.exports = {
  startPolling,
  updateSiteUrl,
  getSiteUrl
};

// If run directly
if (require.main === module) {
  startPolling().catch(console.error);
}
