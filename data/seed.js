const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  const users = db.getUsers();
  if (users.length > 0) {
    return;
  }

  // Seed default admin only if database is completely empty
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  db.createUser({
    id: 'u_1792243956568_s92a8g',
    username: 'Abdulaziz',
    email: 'abdulaziz.akromov7777@gmail.com',
    password: adminPasswordHash,
    phone: '+998 98 300 90 80',
    telegram: '@abdulazizdilshodov',
    role: 'admin',
    balance: 1500000,
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Abdulaziz',
    rating: 5.0,
    reviewCount: 0,
    dealsCompleted: 0,
    isVerified: true
  });

  console.log('Admin user initialized in seed');
}

module.exports = { seed };
