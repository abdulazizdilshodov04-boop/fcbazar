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

// Top up balance (Card / Payme / Click / Uzum)
router.post('/topup', requireAuth, (req, res) => {
  try {
    const { amount, method, cardNumber, cardExpiry, cardHolder } = req.body || {};
    const cleanAmount = String(amount || '').replace(/[\s,\.]/g, '');
    const topupAmount = parseInt(cleanAmount, 10);

    if (isNaN(topupAmount) || topupAmount < 1000) {
      return res.status(400).json({ error: 'Minimal to\'ldirish summasi 1,000 so\'m' });
    }

    if (topupAmount > 50000000) {
      return res.status(400).json({ error: 'Maksimal bir martalik to\'ldirish 50,000,000 so\'m' });
    }

    // Card validation if provided
    const cleanCard = String(cardNumber || '').replace(/[\s-]/g, '');
    if (cleanCard && (cleanCard.length < 16 || cleanCard.length > 19 || !/^\d+$/.test(cleanCard))) {
      return res.status(400).json({ error: 'Karta raqami 16 xonali raqamlardan iborat bo\'lishi kerak (masalan: 8600...)' });
    }

    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    }

    const maskedCard = cleanCard && cleanCard.length >= 16 
      ? `${cleanCard.substring(0, 4)} **** **** ${cleanCard.substring(cleanCard.length - 4)}` 
      : null;

    const newBalance = (user.balance || 0) + topupAmount;
    db.updateUser(user.id, { balance: newBalance });

    const selectedMethod = method || (maskedCard ? 'Bank Kartasi' : 'Payme');
    const txDescription = maskedCard 
      ? `Kartadan to'ldirildi: ${maskedCard}${cardHolder ? ' (' + cardHolder.toUpperCase() + ')' : ''} via ${selectedMethod}`
      : `Hisob to'ldirildi (${selectedMethod})`;

    const tx = db.createTransaction({
      userId: user.id,
      type: 'topup',
      amount: topupAmount,
      balanceAfter: newBalance,
      description: txDescription,
      status: 'completed',
      provider: selectedMethod
    });

    const successMsg = maskedCard
      ? `Kartangizdan (${maskedCard}) ${topupAmount.toLocaleString()} so'm muvaffaqiyatli yechildi va hisobingiz to'ldirildi!`
      : `Hisobingizga ${topupAmount.toLocaleString()} so'm muvaffaqiyatli o'tkazildi!`;

    res.json({
      message: successMsg,
      newBalance,
      transaction: tx
    });
  } catch (err) {
    console.error('Topup error:', err);
    res.status(500).json({ error: 'Hisobni to\'ldirishda xatolik yuz berdi' });
  }
});

// Transfer money to another user (P2P Transfer)
router.post('/transfer', requireAuth, (req, res) => {
  try {
    const { recipient, amount } = req.body || {};
    const cleanAmount = String(amount || '').replace(/[\s,\.]/g, '');
    const transferAmount = parseInt(cleanAmount, 10);

    if (isNaN(transferAmount) || transferAmount < 1000) {
      return res.status(400).json({ error: 'Minimal o\'tkazish summasi 1,000 so\'m' });
    }

    if (!recipient || !recipient.trim()) {
      return res.status(400).json({ error: 'Qabul qiluvchining username yoki pochtasini kiriting' });
    }

    const sender = db.getUserById(req.user.id);
    if (!sender || (sender.balance || 0) < transferAmount) {
      return res.status(400).json({ 
        error: `Balansingizda mablag' yetarli emas! Sizning balansingiz: ${(sender?.balance || 0).toLocaleString()} so'm` 
      });
    }

    const cleanRecipient = recipient.trim().replace(/^@/, '');
    const receiver = db.getUserByEmailOrUsername(cleanRecipient);

    if (!receiver) {
      return res.status(404).json({ error: `@${cleanRecipient} nomli foydalanuvchi topilmadi` });
    }

    if (receiver.id === sender.id) {
      return res.status(400).json({ error: 'O\'zingizga o\'zingiz pul o\'tkaza olmaysiz' });
    }

    // Deduct from sender
    const newSenderBalance = sender.balance - transferAmount;
    db.updateUser(sender.id, { balance: newSenderBalance });

    // Credit to receiver
    const newReceiverBalance = (receiver.balance || 0) + transferAmount;
    db.updateUser(receiver.id, { balance: newReceiverBalance });

    // Record sender transaction
    const senderTx = db.createTransaction({
      userId: sender.id,
      type: 'transfer_out',
      amount: -transferAmount,
      balanceAfter: newSenderBalance,
      description: `@${receiver.username} ga pul o'tkazildi`,
      status: 'completed',
      provider: 'FC Hamyon'
    });

    // Record receiver transaction
    db.createTransaction({
      userId: receiver.id,
      type: 'transfer_in',
      amount: transferAmount,
      balanceAfter: newReceiverBalance,
      description: `@${sender.username} dan pul o'tkazmasi qabul qilindi`,
      status: 'completed',
      provider: 'FC Hamyon'
    });

    res.json({
      message: `@${receiver.username} ga ${transferAmount.toLocaleString()} so'm muvaffaqiyatli o'tkazildi!`,
      newBalance: newSenderBalance,
      transaction: senderTx
    });
  } catch (err) {
    console.error('Transfer error:', err);
    res.status(500).json({ error: 'Pul o\'tkazishda xatolik yuz berdi' });
  }
});

// Request withdrawal
router.post('/withdraw', requireAuth, (req, res) => {
  try {
    const { amount, cardNumber, cardHolder } = req.body || {};
    const cleanAmount = String(amount || '').replace(/[\s,\.]/g, '');
    const withdrawAmount = parseInt(cleanAmount, 10);

    if (isNaN(withdrawAmount) || withdrawAmount < 10000) {
      return res.status(400).json({ error: 'Minimal yechib olish summasi 10,000 so\'m' });
    }

    const cleanCard = (cardNumber || '').replace(/[\s\-]/g, '');
    if (cleanCard.length < 16) {
      return res.status(400).json({ error: 'To\'g\'ri 16 xonali karta raqamini kiriting' });
    }

    const user = db.getUserById(req.user.id);
    if (!user || (user.balance || 0) < withdrawAmount) {
      return res.status(400).json({ error: 'Balansingizda yetarli mablag\' mavjud emas' });
    }

    const newBalance = user.balance - withdrawAmount;
    db.updateUser(user.id, { balance: newBalance });

    const tx = db.createTransaction({
      userId: user.id,
      type: 'withdraw',
      amount: -withdrawAmount,
      balanceAfter: newBalance,
      description: `Kartaga yechib olish: ${cleanCard.slice(0, 4)} **** **** ${cleanCard.slice(-4)} (${cardHolder || 'Egasi'})`,
      status: 'completed',
      provider: 'Uzcard/Humo'
    });

    res.json({
      message: `${withdrawAmount.toLocaleString()} so'm kartangizga o'tkazish uchun yuborildi!`,
      newBalance,
      transaction: tx
    });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ error: 'Yechib olishda xatolik yuz berdi' });
  }
});

module.exports = router;
