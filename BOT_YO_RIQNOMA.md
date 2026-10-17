# 🤖 FC MOBILE BAZAR — TELEGRAM BOT VA 24/7 SOZLASH YO'RIQNOMASI

## 📌 Bot Ma'lumotlari:
- **Bot nomi:** fc mobile akkaunt savdo
- **Bot username:** [@fcmobil27_bot](https://t.me/fcmobil27_bot)
- **Token:** `8996467750:AAFyP-tELXWzLJmjZc5kKVe_cOvKdADKKYo`

---

## ⚡ 1-USUL: Hozir kompyuteringizdan 1 ta bosishda ishlatish

Loyihada **`start-online.bat`** fayli tayyorlab qo'yildi:
1. `start-online.bat` faylini ikki marta bosing.
2. Dastur avtomatik ravishda:
   - FC Mobile Bazar saytini ishga tushiradi
   - Telegram Botni ulaydi (`@fcmobil27_bot`)
   - Dunyo bo'ylab bepul HTTPS manzilini (Cloudflare Tunnel) ulaydi
   - Botga yangi manzilni avtomatik biriktiradi.
3. Telegramga kirib **`/start`** ni bossangiz, sayt to'g'ridan-to'g'ri Telegram ichida (Web App) ochiladi!

---

## 🌐 2-USUL: Kompyuterni o'chirib qo'yganda ham 24/7 ishlashi uchun (Render.com — 100% Bepul)

Kompyuteringiz yopiq bo'lganda ham bot va sayt tun-u kun ishlashi uchun bulutli serverga (Render.com) joylash kerak:

1. [GitHub.com](https://github.com) ga kiring va yangi repository oching (masalan: `fc-bazar`).
2. Loyihani GitHub ga yuklang:
   ```bash
   git init
   git add .
   git commit -m "FC Mobile Bazar with Telegram Bot"
   git branch -M main
   git remote add origin https://github.com/SIZNING_PROFILINGIZ/fc-bazar.git
   git push -u origin main
   ```
3. [Render.com](https://render.com) ga kiring va bepul ro'yxatdan o'ting.
4. **"New +" -> "Web Service"** tugmasini bosing va GitHub dagi repozitoriyangizni tanlang.
5. Sozlamalar:
   - **Name:** `fcmobile-bazar`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free`
6. **Environment Variables (Muhit o'zgaruvchilari)** bo'limiga qo'shing:
   - `BOT_TOKEN` = `8996467750:AAFyP-tELXWzLJmjZc5kKVe_cOvKdADKKYo`
   - `WEB_APP_URL` = Render bergan havola (masalan: `https://fcmobile-bazar.onrender.com`)
7. **"Deploy Web Service"** tugmasini bosing!

🎉 **Tayyor!** Sayt va Telegram botingiz kompyuteringizga umuman bog'liq bo'lmagan holda **24/7/365 to'xtovsiz** ishlaydi!
