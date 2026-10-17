const express = require('express');
const router = express.Router();
const db = require('../data/db');
const { requireAuth } = require('../middleware/auth');

// Get all deals for current user
router.get('/', requireAuth, (req, res) => {
  try {
    const deals = db.getDeals(req.user.id, req.user.role);
    res.json({ deals });
  } catch (err) {
    res.status(500).json({ error: 'Bitimlarni olishda xatolik yuz berdi' });
  }
});

// Get single deal
router.get('/:id', requireAuth, (req, res) => {
  try {
    const deal = db.getDealById(req.params.id);
    if (!deal) {
      return res.status(404).json({ error: 'Bitim topilmadi' });
    }

    const isParticipant = deal.buyerId === req.user.id || deal.sellerId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ error: 'Bu bitimni ko\'rish huquqiga ega emassiz' });
    }

    res.json({ deal });
  } catch (err) {
    res.status(500).json({ error: 'Bitimni yuklashda xatolik yuz berdi' });
  }
});

// START A DEAL (Buy account with Escrow)
router.post('/start', requireAuth, (req, res) => {
  try {
    const { listingId } = req.body;
    const listing = db.getListingById(listingId);

    if (!listing) {
      return res.status(404).json({ error: 'Sotib olinayotgan e\'lon topilmadi' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Bu akkaunt hozirda sotuvda emas yoki allaqachon sotilgan.' });
    }

    if (listing.sellerId === req.user.id) {
      return res.status(400).json({ error: 'O\'zingizning e\'loningizni sotib ololmaysiz!' });
    }

    const buyer = db.getUserById(req.user.id);
    if (!buyer || buyer.balance < listing.price) {
      const required = listing.price - (buyer ? buyer.balance : 0);
      return res.status(400).json({ 
        error: `Balansda mablag' yetarli emas! Sizning balansingiz: ${(buyer?.balance || 0).toLocaleString()} so'm. Yana ${required.toLocaleString()} so'm to'ldirishingiz kerak.`,
        needTopup: true,
        requiredAmount: required
      });
    }

    // 1. Deduct money from buyer balance and hold in escrow
    const newBuyerBalance = buyer.balance - listing.price;
    db.updateUser(buyer.id, { balance: newBuyerBalance });

    // 2. Mark listing as pending_escrow
    db.updateListing(listing.id, { status: 'pending_escrow' });

    // 3. Create Deal
    const deal = db.createDeal({
      listingId: listing.id,
      listingTitle: listing.title,
      listingOvr: listing.ovr,
      listingImage: listing.images[0] || '',
      price: listing.price,
      buyerId: buyer.id,
      buyerName: buyer.username,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      credentialsProvided: listing.credentials || ''
    });

    // 4. Record Transaction
    db.createTransaction({
      userId: buyer.id,
      type: 'escrow_lock',
      amount: -listing.price,
      balanceAfter: newBuyerBalance,
      description: `Garant xavfsiz bitimi #${deal.id.substr(0, 8)} uchun mablag' ushlab turildi (${listing.title})`,
      status: 'completed',
      provider: 'Garant Escrow'
    });

    // Add initial automated instructions
    db.addDealMessage(deal.id, {
      sender: 'system',
      senderName: 'Garant Xizmati',
      text: `Hurmatli @${listing.sellerName}! Akkauntingiz sotib olindi. Iltimos, akkaunt login va parolini quyidagi chat orqali xaridorga yetkazing. Xaridor tekshirib tasdiqlaganidan so'ng ${listing.price.toLocaleString()} so'm balansingizga o'tkaziladi.`
    });

    res.status(201).json({
      message: 'Xavfsiz bitim boshlandi! Mablag\' Garant hisobida xavfsiz saqlanmoqda.',
      dealId: deal.id
    });
  } catch (err) {
    console.error('Deal start error:', err);
    res.status(500).json({ error: 'Bitimni boshlashda xatolik yuz berdi' });
  }
});

// SELLER SENDS CREDENTIALS
router.post('/:id/send-credentials', requireAuth, (req, res) => {
  try {
    const { credentials } = req.body;
    const deal = db.getDealById(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Bitim topilmadi' });
    }

    if (deal.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Faqat sotuvchi ma\'lumotlarni yuborishi mumkin' });
    }

    if (deal.status !== 'escrow_hold') {
      return res.status(400).json({ error: 'Bu bosqichda ma\'lumot yuborib bo\'lmaydi' });
    }

    if (!credentials || credentials.trim().length === 0) {
      return res.status(400).json({ error: 'Akkaunt login va parolini yozing!' });
    }

    db.updateDeal(deal.id, {
      status: 'credentials_sent',
      credentialsProvided: credentials
    });

    db.addDealMessage(deal.id, {
      sender: 'seller',
      senderName: req.user.username,
      senderId: req.user.id,
      text: `🔑 AKKAUNT MA'LUMOTLARI:\n${credentials}\n\nIltimos, o'yinga kirib tekshiring, pochta va parollarni o'zingizga o'zgartiring va bitimni tasdiqlang!`,
      isCredential: true
    });

    res.json({ message: 'Ma\'lumotlar xaridorga yuborildi!', dealId: deal.id });
  } catch (err) {
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// BUYER CONFIRMS ACCOUNT AND RELEASES ESCROW TO SELLER
router.post('/:id/confirm', requireAuth, (req, res) => {
  try {
    const deal = db.getDealById(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Bitim topilmadi' });
    }

    if (deal.buyerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Faqat xaridor bitimni tasdiqlashi mumkin' });
    }

    if (deal.status !== 'credentials_sent' && deal.status !== 'escrow_hold') {
      return res.status(400).json({ error: 'Bu bitim allaqachon yakunlangan yoki bekor qilingan' });
    }

    // 1. Mark deal completed
    db.updateDeal(deal.id, { status: 'completed' });

    // 2. Mark listing sold
    db.updateListing(deal.listingId, { status: 'sold' });

    // 3. Credit seller balance
    const seller = db.getUserById(deal.sellerId);
    if (seller) {
      const newSellerBalance = (seller.balance || 0) + deal.price;
      const newDealsCount = (seller.dealsCompleted || 0) + 1;
      db.updateUser(seller.id, {
        balance: newSellerBalance,
        dealsCompleted: newDealsCount
      });

      // Record seller transaction
      db.createTransaction({
        userId: seller.id,
        type: 'escrow_release',
        amount: deal.price,
        balanceAfter: newSellerBalance,
        description: `Akkaunt savdosi #${deal.id.substr(0, 8)} muvaffaqiyatli yakunlandi (${deal.listingTitle})`,
        status: 'completed',
        provider: 'Garant Escrow'
      });
    }

    // Update buyer completed count
    const buyer = db.getUserById(deal.buyerId);
    if (buyer) {
      db.updateUser(buyer.id, {
        dealsCompleted: (buyer.dealsCompleted || 0) + 1
      });
    }

    // Notify in deal chat
    db.addDealMessage(deal.id, {
      sender: 'system',
      senderName: 'Garant Xizmati',
      text: `🎉 Tabriklaymiz! Xaridor akkauntni qabul qildi va tasdiqladi. ${deal.price.toLocaleString()} so'm mablag' sotuvchining hisobiga muvaffaqiyatli o'tkazildi!`
    });

    res.json({ message: 'Bitim muvaffaqiyatli yakunlandi! Mablag\' sotuvchiga o\'tkazildi.', dealId: deal.id });
  } catch (err) {
    console.error('Confirm deal error:', err);
    res.status(500).json({ error: 'Bitimni tasdiqlashda xatolik yuz berdi' });
  }
});

// DISPUTE / COMPLAINT
router.post('/:id/dispute', requireAuth, (req, res) => {
  try {
    const { reason } = req.body;
    const deal = db.getDealById(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Bitim topilmadi' });
    }

    const isParticipant = deal.buyerId === req.user.id || deal.sellerId === req.user.id;
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Huquqingiz yo\'q' });
    }

    db.updateDeal(deal.id, { status: 'dispute' });

    db.addDealMessage(deal.id, {
      sender: 'system',
      senderName: 'Arbitraj / Shikoyat',
      text: `⚠️ DIQQAT! Foydalanuvchi @${req.user.username} shikoyat yubordi: "${reason || 'Akkaunt ma\'lumotlarida muammo bor'}". Bitim muzlatildi, platforma moderatori aralashmoqda.`
    });

    res.json({ message: 'Shikoyat qabul qilindi. Moderator vaziyatni ko\'rib chiqadi.' });
  } catch (err) {
    res.status(500).json({ error: 'Shikoyat yuborishda xatolik' });
  }
});

// SEND MESSAGE IN DEAL CHAT
router.post('/:id/message', requireAuth, (req, res) => {
  try {
    const { text } = req.body;
    const deal = db.getDealById(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Bitim topilmadi' });
    }

    const isBuyer = deal.buyerId === req.user.id;
    const isSeller = deal.sellerId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ error: 'Bu chatda yozish huquqiga ega emassiz' });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Xabar matni bo\'sh bo\'lishi mumkin emas' });
    }

    let senderRole = 'buyer';
    if (isSeller) senderRole = 'seller';
    if (isAdmin) senderRole = 'admin';

    const msg = db.addDealMessage(deal.id, {
      sender: senderRole,
      senderName: req.user.username,
      senderId: req.user.id,
      text: text.trim()
    });

    res.json({ message: msg });
  } catch (err) {
    res.status(500).json({ error: 'Xabar yuborishda xatolik' });
  }
});

// LEAVE REVIEW
router.post('/:id/review', requireAuth, (req, res) => {
  try {
    const { rating, comment } = req.body;
    const deal = db.getDealById(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Bitim topilmadi' });
    }

    if (deal.buyerId !== req.user.id) {
      return res.status(403).json({ error: 'Faqat xaridor sotuvchiga baho bera oladi' });
    }

    if (deal.status !== 'completed') {
      return res.status(400).json({ error: 'Baho berish uchun bitim yakunlangan bo\'lishi shart' });
    }

    const review = db.createReview({
      dealId: deal.id,
      sellerId: deal.sellerId,
      buyerId: req.user.id,
      buyerName: req.user.username,
      rating: parseInt(rating) || 5,
      comment: comment || 'A\'lo darajada!'
    });

    res.json({ message: 'Fikringiz uchun rahmat!', review });
  } catch (err) {
    res.status(500).json({ error: 'Sharh qoldirishda xatolik yuz berdi' });
  }
});

module.exports = router;
