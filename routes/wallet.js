const express = require('express');
const router = express.Router();
const db = require('../data/db');
const { requireAuth } = require('../middleware/auth');

// Get transaction history
router.get('/transactions', requireAuth, (req, res) => {
  try {
    const list = db.getTransactions(req.user.id);
    res.json({ transactions: list });
  } catch (err) {
    res.status(500).json({ error: 'Tranzaksiyalarni olishda xatolik yuz berdi' });
  }
});

// Top up balance (Payme / Click / Uzum / Test Fast Pay)
router.post('/topup', requireAuth, (req, res) => {
  try {
    const { amount, method } = req.body;
    const topupAmount = parseInt(amount);

    if (isNaN(topupAmount) || topupAmount < 1000) {
      return res.status(400).json({ error: 'Minimal to\'ldirish summasi 1,000 so\'m' });
    }

    if (topupAmount > 50000000) {
      return res.status(400).json({ error: 'Maksimal bir martalik to\'ldirish 50,000,000 so\'m' });
    }

    const user = db.getUserById(req.user.id);
    const newBalance = (user.balance || 0) + topupAmount;
    db.updateUser(user.id, { balance: newBalance });

    const tx = db.createTransaction({
      userId: user.id,
      type: 'topup',
      amount: topupAmount,
      balanceAfter: newBalance,
      description: `Hisob to'ldirildi (${method || 'Payme / Click'})`,
      status: 'completed',
      provider: method || 'Payme'
    });

    res.json({
      message: `Hisobingizga ${topupAmount.toLocaleString()} so'm muvaffaqiyatli o'tkazildi!`,
      newBalance,
      transaction: tx
    });
  } catch (err) {
    res.status(500).json({ error: 'Hisobni to\'ldirishda xatolik yuz berdi' });
  }
});

// Request withdrawal
router.post('/withdraw', requireAuth, (req, res) => {
  try {
    const { amount, cardNumber, cardHolder } = req.body;
    const withdrawAmount = parseInt(amount);

    if (isNaN(withdrawAmount) || withdrawAmount < 10000) {
      return res.status(400).json({ error: 'Minimal yechib olish summasi 10,000 so\'m' });
    }

    if (!cardNumber || cardNumber.replace(/\s+/g, '').length < 16) {
      return res.status(400).json({ error: 'To\'g\'ri 16 xonali karta raqamini kiriting' });
    }

    const user = db.getUserById(req.user.id);
    if (!user || user.balance < withdrawAmount) {
      return res.status(400).json({ error: 'Balansingizda yetarli mablag\' mavjud emas' });
    }

    const newBalance = user.balance - withdrawAmount;
    db.updateUser(user.id, { balance: newBalance });

    const tx = db.createTransaction({
      userId: user.id,
      type: 'withdraw',
      amount: -withdrawAmount,
      balanceAfter: newBalance,
      description: `Kartaga yechib olish: ${cardNumber.slice(0, 4)} **** **** ${cardNumber.slice(-4)} (${cardHolder || 'Egasi'})`,
      status: 'completed',
      provider: 'Uzcard/Humo'
    });

    res.json({
      message: `${withdrawAmount.toLocaleString()} so'm kartangizga o'tkazish uchun yuborildi!`,
      newBalance,
      transaction: tx
    });
  } catch (err) {
    res.status(500).json({ error: 'Yechib olishda xatolik yuz berdi' });
  }
});

module.exports = router;
