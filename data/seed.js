const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  const users = db.getUsers();
  if (users.length > 0) {
    return;
  }

  // Create demo users for testing login
  const userPasswordHash = await bcrypt.hash('123456', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  db.createUser({
    id: 'u_seller_1',
    username: 'jasur_fcmobile',
    email: 'sotuvchi@fc.uz',
    password: userPasswordHash,
    phone: '+998 90 123 45 67',
    telegram: '@jasur_fc',
    role: 'seller',
    balance: 450000,
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=jasur',
    rating: 5.0,
    reviewCount: 0,
    dealsCompleted: 0,
    isVerified: true
  });

  db.createUser({
    id: 'u_buyer_1',
    username: 'sardor_gamer',
    email: 'xaridor@fc.uz',
    password: userPasswordHash,
    phone: '+998 93 987 65 43',
    telegram: '@sardor_gamer',
    role: 'user',
    balance: 1500000,
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sardor',
    rating: 5.0,
    reviewCount: 0,
    dealsCompleted: 0,
    isVerified: true
  });

  db.createUser({
    id: 'u_admin_1',
    username: 'fc_admin',
    email: 'admin@fc.uz',
    password: adminPasswordHash,
    phone: '+998 99 000 00 00',
    telegram: '@abdulazizdilshodov',
    role: 'admin',
    balance: 0,
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
    rating: 5.0,
    reviewCount: 0,
    dealsCompleted: 0,
    isVerified: true
  });

  // NO fake listings! Only real users post accounts!
  console.log('Database initialized without fake listings.');
}

module.exports = { seed };

if (require.main === module) {
  seed();
}
