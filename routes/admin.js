const express = require('express');
const router = express.Router();
const db = require('../data/db');
const { requireAdmin } = require('../middleware/auth');

// All admin routes require admin role
router.use(requireAdmin);

// Dashboard stats
router.get('/stats', (req, res) => {
  try {
    const users = db.getUsers();
    const listings = db.getListings({ status: 'all' });
    const deals = db.getDeals();

    const activeListings = listings.filter(l => l.status === 'active');
    const completedDeals = deals.filter(d => d.status === 'completed');
    const totalVolume = completedDeals.reduce((sum, d) => sum + (d.price || 0), 0);
    const activeDisputes = deals.filter(d => d.status === 'dispute');

    res.json({
      totalUsers: users.length,
      totalListings: listings.length,
      activeListings: activeListings.length,
      totalDeals: deals.length,
      completedDeals: completedDeals.length,
      totalVolume,
      activeDisputes: activeDisputes.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Statistikani olishda xatolik' });
  }
});

// Users management
router.get('/users', (req, res) => {
  try {
    const users = db.getUsers().map(u => {
      const { password, ...safe } = u;
      return safe;
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Foydalanuvchilarni olishda xatolik' });
  }
});

// Update user by admin
router.put('/users/:id', (req, res) => {
  try {
    const { isVerified, role, balanceDelta } = req.body;
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    const updates = {};
    if (isVerified !== undefined) updates.isVerified = !!isVerified;
    if (role !== undefined) updates.role = role;
    if (balanceDelta !== undefined) {
      const delta = parseInt(balanceDelta);
      if (!isNaN(delta)) {
        updates.balance = Math.max(0, (user.balance || 0) + delta);
      }
    }

    const updated = db.updateUser(user.id, updates);
    const { password, ...safe } = updated;
    res.json({ message: 'Foydalanuvchi yangilandi', user: safe });
  } catch (err) {
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Resolve dispute
router.post('/deals/:id/resolve', (req, res) => {
  try {
    const { decision, reason } = req.body; // 'refund_buyer' or 'release_seller'
    const deal = db.getDealById(req.params.id);

    if (!deal) return res.status(404).json({ error: 'Bitim topilmadi' });

    if (decision === 'release_seller') {
      // Complete deal, give money to seller
      db.updateDeal(deal.id, { status: 'completed' });
      db.updateListing(deal.listingId, { status: 'sold' });

      const seller = db.getUserById(deal.sellerId);
      if (seller) {
        const newBalance = (seller.balance || 0) + deal.price;
        db.updateUser(seller.id, {
          balance: newBalance,
          dealsCompleted: (seller.dealsCompleted || 0) + 1
        });
        db.createTransaction({
          userId: seller.id,
          type: 'escrow_release',
          amount: deal.price,
          balanceAfter: newBalance,
          description: `Garant hakamligi: pul sotuvchiga o'tkazildi (Bitim #${deal.id.substr(0, 8)})`,
          status: 'completed',
          provider: 'Admin Qarori'
        });
      }

      db.addDealMessage(deal.id, {
        sender: 'admin',
        senderName: 'Platforma Bosh Hakami',
        text: `⚖️ HAKAMLIK QARORI: Bitim tekshirildi va mablag' sotuvchiga o'tkazildi. Sabab: ${reason || 'Sotuvchi to\'g\'ri ma\'lumot bergan'}`
      });

      return res.json({ message: 'Mablag\' sotuvchiga o\'tkazildi' });
    } else if (decision === 'refund_buyer') {
      // Cancel deal, return money to buyer
      db.updateDeal(deal.id, { status: 'cancelled' });
      db.updateListing(deal.listingId, { status: 'active' }); // return to market

      const buyer = db.getUserById(deal.buyerId);
      if (buyer) {
        const newBalance = (buyer.balance || 0) + deal.price;
        db.updateUser(buyer.id, { balance: newBalance });
        db.createTransaction({
          userId: buyer.id,
          type: 'escrow_refund',
          amount: deal.price,
          balanceAfter: newBalance,
          description: `Garant hakamligi: pul xaridorga qaytarildi (Bitim #${deal.id.substr(0, 8)})`,
          status: 'completed',
          provider: 'Admin Qarori'
        });
      }

      db.addDealMessage(deal.id, {
        sender: 'admin',
        senderName: 'Platforma Bosh Hakami',
        text: `⚖️ HAKAMLIK QARORI: Bitim bekor qilindi va mablag' xaridor balansiga to'liq qaytarildi. Sabab: ${reason || 'Akkaunt ma\'lumotlarida nosozlik aniqlandi'}`
      });

      return res.json({ message: 'Mablag\' xaridorga qaytarildi' });
    } else {
      return res.status(400).json({ error: 'Noma\'lum qaror turi' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Hakamlik qarorini qabul qilishda xatolik' });
  }
});

module.exports = router;
