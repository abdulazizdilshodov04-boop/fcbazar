const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../data/db');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone, telegram } = req.body;

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
    const initialBalance = isAdmin ? 1500000 : 100000;

    const newUser = db.createUser({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      phone: phone || '',
      telegram: telegram || '',
      role: userRole,
      balance: initialBalance,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
      rating: 5.0,
      reviewCount: 0,
      dealsCompleted: 0,
      isVerified: true
    });

    // Record welcome bonus transaction
    db.createTransaction({
      userId: newUser.id,
      type: 'topup',
      amount: initialBalance,
      balanceAfter: initialBalance,
      description: isAdmin ? 'Boshqaruvchi (Admin) hisob balansi' : 'Xush kelibsiz bonusi (Sayt sinovi uchun sovg\'a)',
      status: 'completed',
      provider: 'Bonus / Start'
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
    const { phone, telegram, avatar } = req.body;
    const updates = {};
    if (phone !== undefined) updates.phone = phone;
    if (telegram !== undefined) updates.telegram = telegram;
    if (avatar !== undefined) updates.avatar = avatar;

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
