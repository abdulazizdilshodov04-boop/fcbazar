const fs = require('fs');
const path = require('path');

const LOCAL_DB_PATH = path.join(__dirname, 'database.json');
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_PATH = IS_SERVERLESS ? path.join('/tmp', 'database.json') : LOCAL_DB_PATH;

if (IS_SERVERLESS && !fs.existsSync(DB_PATH) && fs.existsSync(LOCAL_DB_PATH)) {
  try {
    fs.copyFileSync(LOCAL_DB_PATH, DB_PATH);
  } catch (e) {
    console.error('Failed copying database to /tmp:', e);
  }
}

// Default initial state
const defaultData = {
  users: [],
  listings: [],
  deals: [],
  transactions: [],
  reviews: []
};

class Database {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_PATH)) {
      this.save(defaultData);
    }
  }

  read() {
    try {
      if (!fs.existsSync(DB_PATH)) {
        this.save(defaultData);
        return JSON.parse(JSON.stringify(defaultData));
      }
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Error reading database:', err);
      return JSON.parse(JSON.stringify(defaultData));
    }
  }

  save(data) {
    try {
      const tempPath = DB_PATH + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_PATH);
      return true;
    } catch (err) {
      console.error('Error saving database:', err);
      // Fallback direct write
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
        return true;
      } catch (e) {
        console.error('Fatal error saving database directly:', e);
        return false;
      }
    }
  }

  // --- Users Collection ---
  getUsers() {
    return this.read().users || [];
  }

  getUserById(id) {
    return this.getUsers().find(u => u.id === id);
  }

  getUserByEmailOrUsername(identifier) {
    const term = (identifier || '').toLowerCase().trim();
    return this.getUsers().find(u => 
      (u.email && u.email.toLowerCase() === term) || 
      (u.username && u.username.toLowerCase() === term)
    );
  }

  createUser(userData) {
    const data = this.read();
    const newUser = {
      id: userData.id || 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      username: userData.username,
      email: userData.email,
      password: userData.password, // hashed
      phone: userData.phone || '',
      telegram: userData.telegram || '',
      role: userData.role || 'user', // user, admin
      balance: userData.balance || 0,
      frozenBalance: userData.frozenBalance || 0, // balance locked in active escrow
      avatar: userData.avatar || 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20120%20120%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22kg%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23FF416C%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23FF4B2B%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22120%22%20height%3D%22120%22%20rx%3D%2236%22%20fill%3D%22url(%23kg)%22%2F%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2260%22%20r%3D%2246%22%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.16%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2274%22%20font-size%3D%2254%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%3E%F0%9F%A6%81%3C%2Ftext%3E%3C%2Fsvg%3E',
      rating: userData.rating || 5.0,
      reviewCount: userData.reviewCount || 0,
      dealsCompleted: userData.dealsCompleted || 0,
      isVerified: userData.isVerified || false,
      createdAt: new Date().toISOString()
    };
    data.users.push(newUser);
    this.save(data);
    return newUser;
  }

  updateUser(id, updates) {
    const data = this.read();
    const index = data.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    data.users[index] = { ...data.users[index], ...updates };
    this.save(data);
    return data.users[index];
  }

  // --- Listings Collection ---
  getListings(filters = {}) {
    let listings = this.read().listings || [];

    // Filter by status (default active unless specified)
    if (filters.status) {
      if (filters.status !== 'all') {
        listings = listings.filter(item => item.status === filters.status);
      }
    } else {
      listings = listings.filter(item => item.status === 'active');
    }

    // Filter by sellerId
    if (filters.sellerId) {
      listings = listings.filter(item => item.sellerId === filters.sellerId);
    }

    // Search query
    if (filters.query) {
      const q = filters.query.toLowerCase().trim();
      listings = listings.filter(item => 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.topPlayers && item.topPlayers.some(p => p.toLowerCase().includes(q))) ||
        (item.sellerName && item.sellerName.toLowerCase().includes(q))
      );
    }

    // Filter by Min OVR
    if (filters.minOvr) {
      listings = listings.filter(item => item.ovr >= parseInt(filters.minOvr));
    }

    // Filter by Max OVR
    if (filters.maxOvr) {
      listings = listings.filter(item => item.ovr <= parseInt(filters.maxOvr));
    }

    // Filter by Min Price
    if (filters.minPrice) {
      listings = listings.filter(item => item.price >= parseInt(filters.minPrice));
    }

    // Filter by Max Price
    if (filters.maxPrice) {
      listings = listings.filter(item => item.price <= parseInt(filters.maxPrice));
    }

    // Filter by Binding Type
    if (filters.bindingType && filters.bindingType !== 'all') {
      listings = listings.filter(item => item.bindingType.toLowerCase() === filters.bindingType.toLowerCase());
    }

    // Filter by Region
    if (filters.region && filters.region !== 'all') {
      listings = listings.filter(item => item.region.toLowerCase() === filters.region.toLowerCase());
    }

    // Sorting
    if (filters.sort) {
      switch (filters.sort) {
        case 'newest':
          listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'ovr_desc':
          listings.sort((a, b) => b.ovr - a.ovr);
          break;
        case 'price_asc':
          listings.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          listings.sort((a, b) => b.price - a.price);
          break;
        case 'views':
          listings.sort((a, b) => (b.views || 0) - (a.views || 0));
          break;
        default:
          listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    } else {
      listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return listings;
  }

  getListingById(id) {
    const listings = this.read().listings || [];
    return listings.find(l => l.id === id);
  }

  incrementListingViews(id) {
    const data = this.read();
    const item = data.listings.find(l => l.id === id);
    if (item) {
      item.views = (item.views || 0) + 1;
      this.save(data);
    }
  }

  createListing(listingData) {
    const data = this.read();
    const newListing = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: listingData.title,
      ovr: parseInt(listingData.ovr) || 100,
      teamValue: listingData.teamValue || '500M',
      level: parseInt(listingData.level) || 30,
      coins: listingData.coins || '15,000,000',
      gems: listingData.gems || '8,500',
      fcPoints: listingData.fcPoints || '0',
      formation: listingData.formation || '4-3-3 Attack',
      region: listingData.region || 'O\'zbekiston (Global)',
      bindingType: listingData.bindingType || 'EA Account', // EA Account, Google Play, Facebook, Game Center
      price: parseInt(listingData.price) || 100000,
      currency: 'UZS',
      description: listingData.description || '',
      topPlayers: Array.isArray(listingData.topPlayers) ? listingData.topPlayers : (listingData.topPlayers ? listingData.topPlayers.split(',').map(s => s.trim()) : []),
      images: Array.isArray(listingData.images) ? listingData.images : [],
      credentials: listingData.credentials || '', // Hidden from public, sent to buyer upon escrow
      sellerId: listingData.sellerId,
      sellerName: listingData.sellerName,
      sellerRating: listingData.sellerRating || 5.0,
      sellerPhone: listingData.sellerPhone || '',
      sellerTelegram: listingData.sellerTelegram || '',
      payoutCard: listingData.payoutCard || '',
      payoutCardHolder: listingData.payoutCardHolder || '',
      status: 'active', // active, pending_escrow, sold, deleted
      views: 0,
      isFeatured: listingData.isFeatured || false,
      createdAt: new Date().toISOString()
    };
    data.listings.unshift(newListing);
    this.save(data);
    return newListing;
  }

  updateListing(id, updates) {
    const data = this.read();
    const index = data.listings.findIndex(l => l.id === id);
    if (index === -1) return null;
    data.listings[index] = { ...data.listings[index], ...updates };
    this.save(data);
    return data.listings[index];
  }

  deleteListing(id) {
    const data = this.read();
    const index = data.listings.findIndex(l => l.id === id);
    if (index === -1) return false;
    data.listings.splice(index, 1);
    this.save(data);
    return true;
  }

  // --- Deals / Escrow Collection ---
  getDeals(userId = null, role = null) {
    let deals = this.read().deals || [];
    if (userId) {
      deals = deals.filter(d => d.buyerId === userId || d.sellerId === userId);
    }
    return deals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getDealById(id) {
    const deals = this.read().deals || [];
    return deals.find(d => d.id === id);
  }

  createDeal(dealData) {
    const data = this.read();
    const newDeal = {
      id: 'deal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      listingId: dealData.listingId,
      listingTitle: dealData.listingTitle,
      listingOvr: dealData.listingOvr,
      listingImage: dealData.listingImage,
      price: dealData.price,
      buyerId: dealData.buyerId,
      buyerName: dealData.buyerName,
      sellerId: dealData.sellerId,
      sellerName: dealData.sellerName,
      payoutCard: dealData.payoutCard || '',
      payoutCardHolder: dealData.payoutCardHolder || '',
      status: 'escrow_hold', // escrow_hold -> credentials_sent -> verified_by_buyer -> completed OR dispute -> cancelled
      credentialsProvided: dealData.credentialsProvided || '',
      messages: [
        {
          id: 'msg_1',
          sender: 'system',
          senderName: 'FC Bazar Garant Bot',
          text: `Xavfsiz bitim boshlandi! ${dealData.price.toLocaleString()} so'm mablag' Garant hisobida xavfsiz muzlatildi. Sotuvchi ma'lumotlarni yuborishi kutilmoqda.`,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.deals.unshift(newDeal);
    this.save(data);
    return newDeal;
  }

  updateDeal(id, updates) {
    const data = this.read();
    const index = data.deals.findIndex(d => d.id === id);
    if (index === -1) return null;
    data.deals[index] = { 
      ...data.deals[index], 
      ...updates,
      updatedAt: new Date().toISOString() 
    };
    this.save(data);
    return data.deals[index];
  }

  addDealMessage(dealId, message) {
    const data = this.read();
    const deal = data.deals.find(d => d.id === dealId);
    if (!deal) return null;
    if (!deal.messages) deal.messages = [];
    const msg = {
      id: 'msg_' + Date.now(),
      sender: message.sender, // buyer, seller, admin, system
      senderName: message.senderName,
      senderId: message.senderId,
      text: message.text,
      isCredential: message.isCredential || false,
      timestamp: new Date().toISOString()
    };
    deal.messages.push(msg);
    deal.updatedAt = new Date().toISOString();
    this.save(data);
    return msg;
  }

  // --- Transactions Collection ---
  createTransaction(txData) {
    const data = this.read();
    const tx = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      userId: txData.userId,
      type: txData.type, // topup, escrow_lock, escrow_release, escrow_refund, withdraw
      amount: txData.amount,
      balanceAfter: txData.balanceAfter,
      description: txData.description,
      status: txData.status || 'completed', // completed, pending
      provider: txData.provider || 'Payme/Click',
      createdAt: new Date().toISOString()
    };
    data.transactions.unshift(tx);
    this.save(data);
    return tx;
  }

  getTransactions(userId) {
    const list = this.read().transactions || [];
    return list.filter(t => t.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // --- Reviews Collection ---
  createReview(reviewData) {
    const data = this.read();
    const review = {
      id: 'rev_' + Date.now(),
      dealId: reviewData.dealId,
      sellerId: reviewData.sellerId,
      buyerId: reviewData.buyerId,
      buyerName: reviewData.buyerName,
      rating: parseInt(reviewData.rating) || 5,
      comment: reviewData.comment || '',
      createdAt: new Date().toISOString()
    };
    data.reviews.unshift(review);

    // Update seller's average rating
    const sellerReviews = data.reviews.filter(r => r.sellerId === reviewData.sellerId);
    const avg = (sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length).toFixed(1);
    
    const seller = data.users.find(u => u.id === reviewData.sellerId);
    if (seller) {
      seller.rating = parseFloat(avg);
      seller.reviewCount = sellerReviews.length;
    }

    this.save(data);
    return review;
  }

  getReviewsBySeller(sellerId) {
    const reviews = this.read().reviews || [];
    return reviews.filter(r => r.sellerId === sellerId);
  }
}

module.exports = new Database();
