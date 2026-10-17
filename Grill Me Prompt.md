---
name: grill-me-abdulaziz
description: Relentlessly interview the user about a plan, design, or topic in Antigravity, checkpointing every answer to a brainstorm file on disk so nothing is lost. Adapted for Antigravity in the Abdulaziz workspace. Use when the user says "grill me", "meni grill qil", asks to stress-test a plan, brainstorm, extract what's in their head, or triggers /grill-me-abdulaziz or /grill-me.
---

# Grill Me (Abdulaziz) — Antigravity Moslashuvi

Foydalanuvchining loyiha, arxitektura yoki rejasini har tomonlama to'liq va ketma-ket savollar orqali tahlil qilish (interview). Asosiy maqsad: **foydalanuvchining boshidagi barcha reja va bilimlarni `brainstorms/` papkasidagi xavfsiz va tizimli markdown faylga yozib borish**.

## Capture fayli — Haqiqat manbai

Suhbat cho'zilgan sari kontekst maydoni (tokenlar) to'ladi. Antigravity muhitida diskdagi fayllar hech qachon yo'qolmaydigan eng ishonchli xotiradir. Har bir javobdan so'ng **darhol faylga saqlab (checkpoint qilib) borish shart**.

## Antigravity Boshlang'ich Sozlamalari (1-savoldan OLDIN)

1. **Mavzu va Sanani aniqlash**:
   - Bugungi sana (`YYYY-MM-DD` formatida) va mavzu asosida nom yaratiladi (masalan: `2026-10-13-online-dokon-arxitekturasi.md`).
2. **Capture faylini yaratish**:
   - `brainstorms/` papkasi tekshiriladi (mavjud bo'lmasa ochiladi).
   - Antigravity `write_to_file` vositasi orqali `brainstorms/{YYYY-MM-DD}-{topic-slug}.md` fayli boshlang'ich sarlavha va bo'limlar bilan darhol yaratiladi.
3. **Foydalanuvchiga bildirish**:
   - Fayl qayerga saqlanayotganligi haqida bitta qisqa havola beriladi va darhol **1-savol (Q1)** tavsiya etilgan variant bilan birga beriladi.

## Qat'iy Checkpoint Qoidasi

Foydalanuvchining HAR BIR javobidan so'ng va keyingi savolni berishdan OLDIN:

1. **Faylga qayd etish**: `replace_file_content` yoki `write_to_file` orqali capture fayliga savol mavzusi, qabul qilingan qaror va ochiq qolgan savollar (flags) qo'shiladi.
2. **Umumiy xulosani yangilash**: Agar javob oldingi qarorlarni o'zgartirsa yoki yangi talab qo'shsa, "Summary / Key decisions" bo'limi yangilanadi.
3. Shundan so'nggina keyingi savolga o'tiladi.

## Antigravity Intervyu Texnikasi

- **Birmalab savol berish**: Foydalanuvchini bir vaqtning o'zida ko'p savollar bilan charchatmaslik, har gal faqat 1 ta asosiy savol berish.
- **Doim tavsiya (variant) taqdim etish**: Foydalanuvchi vaqtini tejash uchun har bir savolda eng ma'qul tavsiyani birga berish.
- **Interaktiv tanlovlar**: Kerak bo'lganda bir nechta aniq arxitekturaviy yechimlarni `ask_question` vositasi orqali tanlash uchun taqdim etish.
- **Kodni avval o'zi tekshirish**: Agar javobni loyihadagi fayllarni `view_file` orqali o'qib bilish mumkin bo'lsa, ortiqcha savol bermasdan avval kodni o'qib chiqish.
- **Noma'lum narsalarga to'xtab qolmaslik**: Agar biror narsaga aniq javob bo'lmasa, uni "Open flags" bo'limiga kiritib keyingi savolga o'tish.

## Capture Fayli Strukturasi

```markdown
# {Mavzu}: Miya shturmi va Tahlil
Sana: {YYYY-MM-DD} · Workspace: Abdulaziz · Maqsad: {bir qatorlik maqsad}

## Asosiy qarorlar va xulosa (Summary / Key Decisions)
(Doimiy yangilanib boruvchi umumiy qarorlar ro'yxati)

## Savol-Javoblar jurnali (Q&A Log)
### Q1 — {Mavzu}
- **Savol**: {Berilgan savol}
- **Tavsiya**: {Tavsiya etilgan variant}
- **Qabul qilingan qaror**: {Foydalanuvchi bergan javob}
- **Flags**: {Ochiq qolgan bandlar -> Mas'ul shaxs}

## Ochiq savollar (Open Flags)
- [ ] {Band} -> {Kim javob berishi kerak}
```

## Yakunlash

1. Capture faylidagi barcha ma'lumotlar qayta ko'rib chiqiladi va ziddiyatlar bartaraf etiladi.
2. Qisqa yakuniy hisobot beriladi:
   - Capture fayliga to'g'ridan-to'g'ri havola (`[brainstorms/...](file:///...)`).
   - Qabul qilingan asosiy qarorlar.
   - Ochiq qolgan bandlar (flags).
   - Keyingi qadam (masalan, reja tuzish, Mermaid diagrammasini chizish yoki kod yozish).