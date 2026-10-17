const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../data/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Multer storage setup
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'fc-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari (JPEG, PNG, WEBP) qabul qilinadi!'));
    }
  }
});

// Single or multiple image upload endpoint
router.post('/upload', requireAuth, upload.array('photos', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Hech qanday rasm tanlanmadi' });
    }
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ error: 'Rasm yuklashda xatolik yuz berdi' });
  }
});

// GET all listings with filters
router.get('/', optionalAuth, (req, res) => {
  try {
    const { query, minOvr, maxOvr, minPrice, maxPrice, bindingType, region, sort, status, sellerId } = req.query;
    const listings = db.getListings({
      query,
      minOvr,
      maxOvr,
      minPrice,
      maxPrice,
      bindingType,
      region,
      sort,
      status: status || 'active',
      sellerId
    });

    // Strip credentials for public listings
    const sanitized = listings.map(item => {
      const { credentials, ...safe } = item;
      // If user is owner or admin, let them see credentials
      if (req.user && (req.user.id === item.sellerId || req.user.role === 'admin')) {
        return item;
      }
      return safe;
    });

    res.json({ listings: sanitized, total: sanitized.length });
  } catch (err) {
    console.error('Listings get error:', err);
    res.status(500).json({ error: 'E\'lonlarni yuklashda xatolik yuz berdi' });
  }
});

// GET single listing
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const listing = db.getListingById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'E\'lon topilmadi yoki o\'chirilgan' });
    }

    db.incrementListingViews(listing.id);

    // Get seller profile & reviews
    const seller = db.getUserById(listing.sellerId);
    const reviews = seller ? db.getReviewsBySeller(seller.id) : [];

    const isOwner = req.user && (req.user.id === listing.sellerId || req.user.role === 'admin');
    const { credentials, ...safeListing } = listing;

    res.json({
      listing: isOwner ? listing : safeListing,
      seller: seller ? {
        id: seller.id,
        username: seller.username,
        avatar: seller.avatar,
        rating: seller.rating,
        reviewCount: seller.reviewCount,
        dealsCompleted: seller.dealsCompleted,
        isVerified: seller.isVerified,
        telegram: seller.telegram,
        joinedAt: seller.createdAt
      } : null,
      reviews: reviews.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: 'E\'lon ma\'lumotlarini olishda xatolik yuz berdi' });
  }
});

// CREATE new listing
router.post('/', requireAuth, (req, res) => {
  try {
    const {
      title,
      ovr,
      teamValue,
      level,
      coins,
      gems,
      fcPoints,
      formation,
      region,
      bindingType,
      price,
      description,
      topPlayers,
      images,
      credentials
    } = req.body;

    if (!title || !ovr || !price) {
      return res.status(400).json({ error: 'Sarlavha, OVR reyting va narx majburiy maydonlar!' });
    }

    const ovrNum = parseInt(ovr);
    if (isNaN(ovrNum) || ovrNum <= 0) {
      return res.status(400).json({ error: 'Iltimos, OVR reytingini kiriting!' });
    }

    const priceNum = parseInt(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'Iltimos, narxni to\'g\'ri kiriting!' });
    }

    const newListing = db.createListing({
      title: title.trim(),
      ovr: ovrNum,
      teamValue: teamValue || 'Noma\'lum',
      level: parseInt(level) || 1,
      coins: coins || '0',
      gems: gems || '0',
      fcPoints: fcPoints || '0',
      formation: formation || '4-3-3 Attack',
      region: region || 'Global / O\'zbekiston',
      bindingType: bindingType || 'EA Account',
      price: priceNum,
      description: description || '',
      topPlayers: topPlayers || [],
      images: Array.isArray(images) ? images : [],
      credentials: credentials || 'Ma\'lumotlar bitim vaqtida taqdim etiladi',
      sellerId: req.user.id,
      sellerName: req.user.username,
      sellerRating: req.user.rating,
      sellerPhone: req.user.phone,
      sellerTelegram: req.user.telegram
    });

    res.status(201).json({
      message: 'Akkaunt e\'loni muvaffaqiyatli joylashtirildi!',
      listing: newListing
    });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: 'E\'lon joylashtirishda xatolik yuz berdi' });
  }
});

// UPDATE listing
router.put('/:id', requireAuth, (req, res) => {
  try {
    const listing = db.getListingById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'E\'lon topilmadi' });
    }

    if (listing.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Siz bu e\'lonni tahrirlash huquqiga ega emassiz' });
    }

    const allowed = [
      'title', 'ovr', 'teamValue', 'level', 'coins', 'gems', 'fcPoints', 
      'formation', 'region', 'bindingType', 'price', 'description', 
      'topPlayers', 'images', 'credentials', 'status'
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updated = db.updateListing(listing.id, updates);
    res.json({ message: 'E\'lon muvaffaqiyatli yangilandi', listing: updated });
  } catch (err) {
    res.status(500).json({ error: 'E\'lonni yangilashda xatolik yuz berdi' });
  }
});

// DELETE listing
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const listing = db.getListingById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'E\'lon topilmadi' });
    }

    if (listing.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Siz bu e\'lonni o\'chirish huquqiga ega emassiz' });
    }

    db.deleteListing(listing.id);
    res.json({ message: 'E\'lon muvaffaqiyatli o\'chirildi' });
  } catch (err) {
    res.status(500).json({ error: 'E\'lonni o\'chirishda xatolik yuz berdi' });
  }
});

module.exports = router;
