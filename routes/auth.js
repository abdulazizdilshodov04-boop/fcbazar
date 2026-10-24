const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../data/db');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

function getDefaultKahootAvatar(username) {
  const emojis = ['🦁', '🤖', '👑', '⚡', '🥷', '🔥', '🎮', '🐯', '🐲', '👾', '🦈', '🚀', '🏆', '👻', '🐺', '💎'];
  const colors = [
    ['#FF416C', '#FF4B2B'],
    ['#4A00E0', '#8E2DE2'],
    ['#00C9FF', '#92FE9D'],
    ['#f857a6', '#ff5858'],
    ['#11998e', '#38ef7d'],
    ['#FC466B', '#3F5EFB'],
    ['#F37335', '#FDC830'],
    ['#0052D4', '#4364F7']
  ];
  let seed = 0;
  for (let i = 0; i < (username || 'user').length; i++) {
    seed += username.charCodeAt(i);
  }
  const emoji = emojis[seed % emojis.length];
  const [c1, c2] = colors[seed % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><defs><linearGradient id="kg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="120" height="120" rx="36" fill="url(#kg)"/><circle cx="60" cy="60" r="46" fill="#ffffff" fill-opacity="0.16"/><text x="60" y="74" font-size="54" text-anchor="middle" font-family="'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif">${emoji}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone, telegram, avatar } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Foydalanuvchi nomi, email va parol kiritilishi shart.' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Foydalanuvchi nomi kamida 3 ta belgidan iborat bo\'lishi kerak.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    // Check existing email specifically
    const existingEmail = db.getUsers().find(u => (u.email || '').toLowerCase() === cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: 'Ushbu elektron pochta (email) allaqachon ro\'yxatdan o\'tgan. Iltimos, "Kirish" bo\'limidan kiring.' });
    }

    // Check existing username specifically
    const existingUsername = db.getUsers().find(u => (u.username || '').toLowerCase() === cleanUsername.toLowerCase());
    if (existingUsername) {
      return res.status(400).json({ error: `"${cleanUsername}" foydalanuvchi nomi allaqachon band. Iltimos, boshqa nom tanlang yoki "Kirish" qiling.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Auto admin for Abdulaziz or first user
    const allUsers = db.getUsers();
    const isFirstUser = allUsers.length === 0;
    const isAdmin = isFirstUser || 
                    cleanUsername.toLowerCase() === 'abdulaziz' || 
                    cleanEmail.includes('abdulaziz') ||
                    (telegram && telegram.toLowerCase().includes('abdulazizdilshodov'));
    const userRole = isAdmin ? 'admin' : 'user';

    const newUser = db.createUser({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      phone: phone || '',
      telegram: telegram || '',
      role: userRole,
      balance: 0,
      avatar: avatar || getDefaultKahootAvatar(cleanUsername),
      rating: 5.0,
      reviewCount: 0,
      dealsCompleted: 0,
      isVerified: true
    });

    const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET, {
      expiresIn: '7d'
    });

    const { password: _, ...userSafe } = newUser;
    res.status(201).json({
      message: 'Muvaffaqiyatli ro\'yxatdan o\'tdingiz!',
      token,
      user: userSafe
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server xatosi yuz berdi. Qaytadan urinib ko\'ring.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Login va parol kiritilishi shart.' });
    }

    const user = db.getUserByEmailOrUsername(identifier);
    if (!user) {
      return res.status(400).json({ error: 'Login yoki parol noto\'g\'ri.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Login yoki parol noto\'g\'ri.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: '7d'
    });

    const { password: _, ...userSafe } = user;
    res.json({
      message: 'Xush kelibsiz!',
      token,
      user: userSafe
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi.' });
  }
});

// Current User Profile
router.get('/me', requireAuth, (req, res) => {
  const { password: _, ...userSafe } = req.user;
  res.json({ user: userSafe });
});

// Update Profile
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { phone, telegram, avatar, payoutCard, payoutCardHolder } = req.body;
    const updates = {};
    if (phone !== undefined) updates.phone = phone;
    if (telegram !== undefined) updates.telegram = telegram;
    if (avatar !== undefined) updates.avatar = avatar;
    if (payoutCard !== undefined) {
      updates.payoutCard = String(payoutCard).replace(/[\s-]/g, '');
    }
    if (payoutCardHolder !== undefined) {
      updates.payoutCardHolder = payoutCardHolder.trim();
    }

    const updated = db.updateUser(req.user.id, updates);
    const { password: _, ...userSafe } = updated;
    res.json({ message: 'Profil muvaffaqiyatli yangilandi', user: userSafe });
  } catch (err) {
    res.status(500).json({ error: 'Profilni yangilashda xatolik yuz berdi.' });
  }
});

// Public User Profile
router.get('/users/:id', (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
  }
  const reviews = db.getReviewsBySeller(user.id);
  const activeListings = db.getListings({ sellerId: user.id, status: 'active' });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      rating: user.rating,
      reviewCount: user.reviewCount,
      dealsCompleted: user.dealsCompleted,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      telegram: user.telegram
    },
    reviews,
    activeListingsCount: activeListings.length
  });
});

module.exports = router;
