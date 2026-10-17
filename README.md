# ⚽ FC BAZAR — FC Mobile Akkauntlar Savdosi va Garant Platformasi

O'zbekistondagi **FC Mobile (FIFA Mobile)** o'yini akkauntlarini 24/7 xavfsiz sotish va sotib olish uchun mo'ljallangan to'liq avtomatlashtirilgan savdo platformasi.

---

## 🌟 Asosiy Imkoniyatlar

1. **Xavfsiz Garant (Escrow) Tizimi**:
   - Xaridor to'lagan pul sotuvchiga darhol berilmaydi, Garant hisobida xavfsiz muzlatiladi.
   - Sotuvchi akkaunt login va parolini xavfsiz bitim chatida topshiradi.
   - Xaridor o'yinga kirib akkauntni tekshiradi, parollarni o'zgartiradi va bitimni tasdiqlaydi.
   - Tasdiqlangandan so'ng pul sotuvchiga o'tkaziladi. Agar muammo bo'lsa, **Arbitraj** tugmasi orqali moderator aralashadi va pulni qaytaradi.
2. **Akkaunt Joylashtirish (Sotuvchi bo'lish)**:
   - OVR reyting (60 - 125 OVR)
   - Jamoa qiymati (Team value, masalan: 850M Tanga)
   - Erkin tangalar (Coins), Gemlar va FC Points
   - Bog'lanish turi: **EA Account**, **Google Play**, **Facebook**, **Game Center**
   - Taktika (Formation: 4-3-3 Attack, 4-1-2-1-2 va h.k.)
   - Asosiy o'yinchilar (R9, Gullit, Mbappe, Zidane va h.k.)
   - Skrinshot rasmlarini yuklash (5 tagacha rasm)
   - Maxfiy login/parol saqlash (faqat bitim boshlanganda ochiladi)
3. **Akkaunt Qidirish va Filtrlash**:
   - Real vaqtdagi tezkor qidiruv (o'yinchi nomi yoki sarlavha bo'yicha)
   - OVR bo'yicha saralash (105+ OVR, 100-104 OVR, 95-99 OVR)
   - Narx bo'yicha saralash (Arzon/Qimmat)
   - Bog'lanish usuli va server bo'yicha filtrlar
4. **Hamyon & Balans**:
   - **Payme**, **Click**, **Uzum Bank** hamda **1-Klik Tezkor Sinov** orqali hisobni to'ldirish
   - Uzcard / Humo kartalariga yechib olish
   - Tranzaksiyalar tarixi va cheklar
5. **Jonli Bitim Xonasi (Deal Room & Chat)**:
   - Xaridor va Sotuvchi o'rtasida real vaqtdagi chat
   - Akkaunt ma'lumotlarini xavfsiz almashish
   - Bosqichma-bosqich statuslar (Mablag' muzlatildi ➔ Login berildi ➔ Yakunlandi)
6. **Boshqaruv (Admin & Moderator)**:
   - Sayt statistikasi (Aylanma summa, faol e'lonlar, foydalanuvchilar)
   - Shikoyat va nizolarni ko'rib chiqish hamda hakamlik qilish
   - Foydalanuvchilarni tasdiqlash (Verified badge)

---

## 🚀 Ishga Tushirish

Server hozirning o'zida kompyuteringizda **24/7 rejimida ishlab turibdi**:
👉 **Brauzerda ochish**: [http://localhost:5000](http://localhost:5000)

Kelgusida serverni qayta ishga tushirish uchun:
- `start.bat` faylini ikki marta bosing, yoki:
```bash
node server.js
```

---

## 🔑 Sinov Uchun Tayyor Test Akkauntlar

Saytga kirganda modal oynadagi **"Tezkor test kirish"** tugmalari orqali 1 ta klik bilan kirsangiz bo'ladi:

| Foydalanuvchi | Email | Parol | Rol / Tavsif |
|---|---|---|---|
| **Sotuvchi (Jasur)** | `sotuvchi@fc.uz` | `123456` | 4.9⭐ reytingli ishonchli sotuvchi |
| **Xaridor (Sardor)** | `xaridor@fc.uz` | `123456` | 1,500,000 so'm balansi bor xaridor |
| **Admin (Garant)** | `admin@fc.uz` | `admin123` | Platforma moderatori va bosh hakami |

Yoki istalgan odam **"Ro'yxatdan o'tish"** orqali yangi hisob ochishi mumkin (har bir yangi foydalanuvchiga **100,000 so'm** boshlang'ich sinov balansi sovg'a qilinadi).

---

## 🌐 24/7 Internetda Ishlatish (Deploy)

Saytni butun dunyo yoki O'zbekiston bo'ylab doimiy ishlatish uchun:
1. **Render.com / Railway.app / VPS**:
   - Ushbu loyiha hech qanday murakkab sozlashlarsiz, faqat `npm install` va `node server.js` orqali istalgan hostingda 24/7 ishlaydi.
2. **Lokal kompyuterdan internetga ochish**:
   - `ngrok http 5000` yoki Cloudflare Tunnels orqali bir necha soniyada dunyoga havola qilib berish mumkin.
