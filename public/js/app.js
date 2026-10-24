/**
 * FC BAZAR — Main Frontend Application Logic
 */

const app = {
  state: {
    user: null,
    listings: [],
    deals: [],
    currentDeal: null,
    activeView: 'catalog',
    filters: {
      query: '',
      minOvr: null,
      maxOvr: null,
      bindingType: 'all',
      maxPrice: 'all',
      sort: 'newest'
    },
    uploadedImages: [],
    dealPollInterval: null,
    debounceTimer: null
  },

  async init() {
    console.log('⚽ FC Bazar ilovasi ishga tushmoqda...');
    
    // Telegram Web App initialization
    if (window.Telegram && window.Telegram.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      } catch (tgErr) {
        console.warn('Telegram WebApp init:', tgErr);
      }
    }

    // Check saved session
    const token = API.getToken();
    if (token) {
      try {
        const res = await API.auth.me();
        this.state.user = res.user;
        API.setUser(res.user);
      } catch (e) {
        console.warn('Avtorizatsiya eskirgan:', e);
        API.setToken(null);
        API.setUser(null);
        this.state.user = null;
      }
    }

    this.updateAuthUI();
    this.loadListings();

    // Check if URL has hash route
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('deal-')) {
      const dealId = hash.replace('deal-', '');
      this.openDealRoom(dealId);
    } else if (['howitworks', 'deals', 'profile', 'admin'].includes(hash)) {
      this.navigate(hash);
    }
  },

  // ==================== AUTH & USER UI ====================
  updateAuthUI() {
    const guestSection = document.getElementById('auth-guest-section');
    const userSection = document.getElementById('auth-user-section');
    const navBalance = document.getElementById('nav-user-balance');
    const navAvatar = document.getElementById('nav-user-avatar');
    const navName = document.getElementById('nav-user-name');
    const adminBtn = document.getElementById('nav-btn-admin');
    const menuTitle = document.getElementById('menu-user-title');
    const menuRole = document.getElementById('menu-user-role');

    if (this.state.user) {
      guestSection.style.display = 'none';
      userSection.style.display = 'flex';

      navBalance.textContent = (this.state.user.balance || 0).toLocaleString() + " so'm";
      navAvatar.src = this.state.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
      navName.textContent = this.state.user.username;

      menuTitle.textContent = this.state.user.username;
      menuRole.textContent = this.state.user.role === 'admin' ? '🛡️ Platforma Admini' : '🎮 Foydalanuvchi';

      if (this.state.user.role === 'admin') {
        adminBtn.style.display = 'flex';
      } else {
        adminBtn.style.display = 'none';
      }

      this.updateActiveDealsCount();
    } else {
      guestSection.style.display = 'flex';
      userSection.style.display = 'none';
      adminBtn.style.display = 'none';
    }
  },

  toggleUserMenu() {
    const menu = document.getElementById('user-dropdown-menu');
    menu.classList.toggle('show');
  },

  toggleMobileMenu() {
    const menu = document.querySelector('.nav-menu');
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
  },

  openAuthModal(tab = 'login') {
    this.switchAuthTab(tab);
    this.openModal('modal-auth');
  },

  switchAuthTab(tab) {
    const tabLogin = document.getElementById('tab-login');
    const tabReg = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formReg = document.getElementById('form-register');

    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabReg.classList.remove('active');
      formLogin.style.display = 'block';
      formReg.style.display = 'none';
    } else {
      tabReg.classList.add('active');
      tabLogin.classList.remove('active');
      formLogin.style.display = 'none';
      formReg.style.display = 'block';
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-submit-login');

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Tekshirilmoqda...';

      const res = await API.auth.login(identifier, password);
      API.setToken(res.token);
      API.setUser(res.user);
      this.state.user = res.user;

      this.updateAuthUI();
      this.closeModal('modal-auth');
      this.showToast(`Xush kelibsiz, ${res.user.username}!`, 'success');

      // Refresh listings or active views
      this.loadListings();
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Kirish';
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const telegram = document.getElementById('reg-telegram').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const btn = document.getElementById('btn-submit-register');

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Ro\'yxatdan o\'tkazilmoqda...';

      const res = await API.auth.register({ username, email, telegram, phone, password });
      API.setToken(res.token);
      API.setUser(res.user);
      this.state.user = res.user;

      this.updateAuthUI();
      this.closeModal('modal-auth');
      this.showToast(`Ro'yxatdan o'tdingiz! Sizga 100,000 so'm start bonusi berildi 🎉`, 'success');
      this.loadListings();
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Ro\'yxatdan O\'tish';
    }
  },

  async demoLogin(identifier, password) {
    try {
      this.showToast('Test akkauntga kirilmoqda...', 'info');
      const res = await API.auth.login(identifier, password);
      API.setToken(res.token);
      API.setUser(res.user);
      this.state.user = res.user;

      this.updateAuthUI();
      this.closeModal('modal-auth');
      this.showToast(`Test kirish muvaffaqiyatli: @${res.user.username}`, 'success');
      this.loadListings();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  openFastTestModal() {
    this.openAuthModal('login');
  },

  logout() {
    API.setToken(null);
    API.setUser(null);
    this.state.user = null;
    this.updateAuthUI();
    document.getElementById('user-dropdown-menu').classList.remove('show');
    this.navigate('catalog');
    this.showToast('Tizimdan chiqdingiz', 'info');
  },

  // ==================== NAVIGATION & ROUTING ====================
  navigate(viewId, params = {}) {
    // Hide all views
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });

    // Update active nav button
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    const navBtn = document.getElementById(`nav-btn-${viewId}`);
    if (navBtn) {
      navBtn.classList.add('active');
    }

    this.state.activeView = viewId;
    window.location.hash = viewId;

    // View specific triggers
    if (viewId === 'catalog') {
      this.loadListings();
    } else if (viewId === 'deals') {
      if (!this.requireLoginPrompt()) return;
      this.loadDeals();
    } else if (viewId === 'profile' || viewId === 'my-listings') {
      if (!this.requireLoginPrompt()) return;
      this.loadProfile();
      if (viewId === 'my-listings') {
        this.switchProfileSubtab('listings');
      }
    } else if (viewId === 'admin') {
      if (!this.state.user || this.state.user.role !== 'admin') {
        this.showToast('Faqat admin uchun ruxsat berilgan', 'error');
        this.navigate('catalog');
        return;
      }
      this.loadAdminData();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('user-dropdown-menu')?.classList.remove('show');
  },

  requireLoginPrompt() {
    if (!this.state.user) {
      this.showToast('Iltimos, avval tizimga kiring', 'info');
      this.openAuthModal('login');
      return false;
    }
    return true;
  },

  scrollToCatalog() {
    const el = document.getElementById('catalog-anchor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  },

  // ==================== CATALOG & LISTINGS ====================
  async loadListings() {
    try {
      const params = {};
      if (this.state.filters.query) params.query = this.state.filters.query;
      if (this.state.filters.minOvr) params.minOvr = this.state.filters.minOvr;
      if (this.state.filters.maxOvr) params.maxOvr = this.state.filters.maxOvr;
      if (this.state.filters.bindingType !== 'all') params.bindingType = this.state.filters.bindingType;
      if (this.state.filters.maxPrice !== 'all') params.maxPrice = this.state.filters.maxPrice;
      if (this.state.filters.sort) params.sort = this.state.filters.sort;

      const res = await API.listings.getAll(params);
      this.state.listings = res.listings || [];
      this.renderListings();
    } catch (err) {
      this.showToast('E\'lonlarni yuklashda xatolik', 'error');
    }
  },

  renderListings() {
    const container = document.getElementById('listings-grid-container');
    const emptyState = document.getElementById('listings-empty-state');
    const resultsCount = document.getElementById('results-count');

    resultsCount.textContent = `${this.state.listings.length} ta akkaunt`;

    if (this.state.listings.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = this.state.listings.map(item => {
      const bindingClass = (item.bindingType || '').toLowerCase().includes('ea') ? 'ea' :
                           (item.bindingType || '').toLowerCase().includes('google') ? 'google' : 'facebook';

      const hasImage = item.images && item.images.length > 0;
      const playersHtml = (item.topPlayers || []).slice(0, 3).map(p => `<span class="player-chip">${p}</span>`).join('');

      const mediaHtml = hasImage ? `
        <div class="fc-card-media">
          <img src="${item.images[0]}" alt="${item.title}" class="fc-card-img" loading="lazy">
          <div class="fc-card-gradient"></div>
          
          <div class="ovr-shield-badge">
            <span class="ovr-number">${item.ovr}</span>
            <span class="ovr-label">OVR</span>
          </div>

          <div class="binding-tag-pill ${bindingClass}">
            <i class="fa-solid fa-link"></i> ${item.bindingType || 'EA Account'}
          </div>
        </div>
      ` : `
        <div class="fc-card-media no-image-pitch">
          <div class="pitch-tactics-bg">
            <div class="pitch-circle"></div>
            <div class="pitch-line"></div>
          </div>
          
          <div class="ovr-shield-badge">
            <span class="ovr-number">${item.ovr}</span>
            <span class="ovr-label">OVR</span>
          </div>

          <div class="pitch-meta-center">
            <span class="pitch-formation-title"><i class="fa-solid fa-futbol text-neon"></i> ${item.formation || '4-3-3 Attack'}</span>
            <span class="pitch-ovr-tag">${item.ovr} OVR TARKIB</span>
          </div>

          <div class="binding-tag-pill ${bindingClass}">
            <i class="fa-solid fa-link"></i> ${item.bindingType || 'EA Account'}
          </div>
        </div>
      `;

      return `
        <div class="fc-card" onclick="app.openListingDetails('${item.id}')">
          ${mediaHtml}

          <div class="fc-card-body">
            <h3 class="fc-card-title">${item.title}</h3>

            <div class="fc-card-stats">
              <div class="stat-pill"><i class="fa-solid fa-coins"></i> ${item.teamValue || 'Noma\'lum'}</div>
              <div class="stat-pill"><i class="fa-solid fa-shield-halved"></i> ${item.formation || '4-3-3'}</div>
              <div class="stat-pill"><i class="fa-solid fa-gem text-cyan"></i> ${item.gems || '0'}</div>
            </div>

            <div class="players-tags-wrap">
              ${playersHtml}
            </div>

            <div class="fc-card-footer">
              <div class="seller-brief">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" class="seller-mini-avatar">
                <div>
                  <span class="seller-mini-name">@${item.sellerName || 'Sotuvchi'}</span>
                  <div class="seller-mini-rating">
                    <i class="fa-solid fa-star"></i> ${item.sellerRating || '5.0'}
                  </div>
                </div>
              </div>

              <div class="price-box">
                <div class="price-amount">${(item.price || 0).toLocaleString()}</div>
                <div class="price-currency">SO'M (UZS)</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  debounceFilter() {
    clearTimeout(this.state.debounceTimer);
    const searchVal = document.getElementById('filter-search').value;
    const clearBtn = document.getElementById('btn-clear-search');
    clearBtn.style.display = searchVal ? 'block' : 'none';

    this.state.debounceTimer = setTimeout(() => {
      this.state.filters.query = searchVal;
      this.loadListings();
    }, 300);
  },

  clearSearch() {
    document.getElementById('filter-search').value = '';
    document.getElementById('btn-clear-search').style.display = 'none';
    this.state.filters.query = '';
    this.loadListings();
  },

  setOvrFilter(ovrRange) {
    document.querySelectorAll('.ovr-chip').forEach(btn => btn.classList.remove('active'));
    const clickedBtn = document.querySelector(`.ovr-chip[data-ovr="${ovrRange}"]`);
    if (clickedBtn) clickedBtn.classList.add('active');

    if (ovrRange === 'all') {
      this.state.filters.minOvr = null;
      this.state.filters.maxOvr = null;
    } else if (ovrRange === '125+') {
      this.state.filters.minOvr = 125;
      this.state.filters.maxOvr = null;
    } else if (ovrRange === '120-124') {
      this.state.filters.minOvr = 120;
      this.state.filters.maxOvr = 124;
    } else if (ovrRange === '100-119') {
      this.state.filters.minOvr = 100;
      this.state.filters.maxOvr = 119;
    }

    this.loadListings();
  },

  applyFilters() {
    this.state.filters.sort = document.getElementById('filter-sort').value;
    this.state.filters.bindingType = document.getElementById('filter-binding').value;
    this.state.filters.maxPrice = document.getElementById('filter-max-price').value;
    this.loadListings();
  },

  resetFilters() {
    document.getElementById('filter-search').value = '';
    document.getElementById('btn-clear-search').style.display = 'none';
    document.getElementById('filter-sort').value = 'newest';
    document.getElementById('filter-binding').value = 'all';
    document.getElementById('filter-max-price').value = 'all';

    this.state.filters = {
      query: '',
      minOvr: null,
      maxOvr: null,
      bindingType: 'all',
      maxPrice: 'all',
      sort: 'newest'
    };

    document.querySelectorAll('.ovr-chip').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.ovr-chip[data-ovr="all"]')?.classList.add('active');

    this.loadListings();
  },

  // ==================== LISTING DETAILS MODAL ====================
  async openListingDetails(id) {
    try {
      this.showToast('Akkaunt ma\'lumotlari ochilmoqda...', 'info');
      const res = await API.listings.getById(id);
      const item = res.listing;
      const seller = res.seller;
      const reviews = res.reviews || [];

      const modalContent = document.getElementById('modal-details-content');
      
      const isMyListing = this.state.user && this.state.user.id === item.sellerId;
      const hasImage = item.images && item.images.length > 0;

      const playersHtml = (item.topPlayers || []).map(p => `
        <span class="player-chip" style="font-size:0.85rem; padding: 5px 12px;"><i class="fa-solid fa-futbol text-neon"></i> ${p}</span>
      `).join('');

      const reviewsHtml = reviews.length > 0 ? reviews.map(r => `
        <div style="background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:8px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
            <b>@${r.buyerName}</b>
            <span class="text-gold">★ ${r.rating}</span>
          </div>
          <p style="font-size:0.85rem; color:#8b9bb4; margin:0;">${r.comment}</p>
        </div>
      `).join('') : '<p style="color:#8b9bb4; font-size:0.85rem;">Hozircha sharhlar yo\'q</p>';

      const mediaBlock = hasImage ? `
        <div style="flex:1; min-width:300px; position:relative; border-radius:14px; overflow:hidden; aspect-ratio:16/9; background:#000; border:1px solid rgba(0,255,135,0.3); box-shadow:0 10px 30px rgba(0,0,0,0.6);">
          <img src="${item.images[0]}" style="width:100%; height:100%; object-fit:contain; background:#060a12;">
          <div class="ovr-shield-badge" style="top:20px; left:20px; width:65px; height:80px;">
            <span class="ovr-number" style="font-size:1.9rem;">${item.ovr}</span>
            <span class="ovr-label">OVR</span>
          </div>
        </div>
      ` : `
        <div style="flex:1; min-width:300px; position:relative; border-radius:14px; overflow:hidden; aspect-ratio:16/9; background:radial-gradient(circle at 50% 50%, #172640 0%, #0a111c 85%); border:1px solid rgba(0,255,135,0.25); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
          <div class="ovr-shield-badge" style="top:20px; left:20px; width:65px; height:80px;">
            <span class="ovr-number" style="font-size:1.9rem;">${item.ovr}</span>
            <span class="ovr-label">OVR</span>
          </div>
          <i class="fa-solid fa-futbol" style="font-size:3.5rem; color:rgba(0,255,135,0.25); margin-bottom:10px;"></i>
          <h3 style="font-family:'Chakra Petch'; font-size:1.8rem; color:#fff; margin-bottom:4px;">${item.ovr} OVR TARKIB</h3>
          <span style="font-size:0.9rem; color:#00f0ff; font-weight:700;">${item.formation || '4-3-3 Attack'} • ${item.bindingType || 'EA Account'}</span>
        </div>
      `;

      modalContent.innerHTML = `
        <button class="modal-close-btn" onclick="app.closeModal('modal-details')">&times;</button>
        
        <div style="display:flex; gap:20px; flex-wrap:wrap; margin-bottom:20px;">
          ${mediaBlock}

          <div style="flex:1; min-width:280px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <span style="font-size:0.8rem; color:#00f0ff; font-weight:700; text-transform:uppercase;">
                <i class="fa-solid fa-shield"></i> 100% GARANT BILAN HIMOYALANGAN
              </span>
              <h2 style="font-size:1.4rem; font-weight:800; margin:6px 0 14px; line-height:1.3;">${item.title}</h2>
              
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
                <div style="background:#162032; padding:10px; border-radius:8px;">
                  <span style="font-size:0.75rem; color:#8b9bb4;">Jamoa Qiymati</span>
                  <div style="font-weight:700; color:#fff;">${item.teamValue || '500M'}</div>
                </div>
                <div style="background:#162032; padding:10px; border-radius:8px;">
                  <span style="font-size:0.75rem; color:#8b9bb4;">Bog'langan</span>
                  <div style="font-weight:700; color:#00ff87;">${item.bindingType || 'EA Account'}</div>
                </div>
                <div style="background:#162032; padding:10px; border-radius:8px;">
                  <span style="font-size:0.75rem; color:#8b9bb4;">Erkin Tangalar (Coins)</span>
                  <div style="font-weight:700; color:#ffb800;">${item.coins || '0'}</div>
                </div>
                <div style="background:#162032; padding:10px; border-radius:8px;">
                  <span style="font-size:0.75rem; color:#8b9bb4;">Gemlar</span>
                  <div style="font-weight:700; color:#00f0ff;">${item.gems || '0'}</div>
                </div>
              </div>
            </div>

            <div style="background:#101726; border:1px solid rgba(0,255,135,0.3); padding:16px; border-radius:12px; margin-top:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div>
                  <span style="font-size:0.8rem; color:#8b9bb4;">Akkaunt Narxi:</span>
                  <div style="font-family:'Chakra Petch'; font-size:1.8rem; font-weight:800; color:#00ff87; line-height:1;">
                    ${(item.price || 0).toLocaleString()} <span style="font-size:1rem; color:#8b9bb4;">SO'M</span>
                  </div>
                </div>
                ${isMyListing ? '<span class="badge-counter" style="background:#3b82f6;">Sizning e\'loningiz</span>' : ''}
              </div>

              ${isMyListing ? `
                <button class="btn btn-danger btn-block" onclick="app.deleteListing('${item.id}')">
                  <i class="fa-solid fa-trash"></i> E'lonni O'chirish
                </button>
              ` : `
                <button class="btn btn-primary btn-block btn-lg" onclick="app.promptBuyAccount('${item.id}', ${item.price})">
                  <i class="fa-solid fa-shield-halved"></i> Garant Bilan Sotib Olish
                </button>
              `}
            </div>
          </div>
        </div>

        <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:20px; margin-top:20px;">
          <h4 style="font-size:1.05rem; margin-bottom:10px;">Asosiy O'yinchilar:</h4>
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px;">
            ${playersHtml}
          </div>

          <h4 style="font-size:1.05rem; margin-bottom:8px;">Akkaunt Tavsifi:</h4>
          <p style="color:#8b9bb4; font-size:0.95rem; line-height:1.6; margin-bottom:24px;">
            ${item.description || 'Qo\'shimcha tavsif berilmagan.'}
          </p>

          <div style="display:flex; align-items:center; justify-content:space-between; background:#162032; padding:16px; border-radius:12px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="${seller?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}" style="width:46px; height:46px; border-radius:50%; object-fit:cover; border:1px solid #00ff87;">
              <div>
                <h5 style="margin:0; font-size:0.95rem;">@${seller?.username || item.sellerName} <i class="fa-solid fa-circle-check text-neon" title="Tasdiqlangan"></i></h5>
                <span style="font-size:0.8rem; color:#8b9bb4;">⭐ ${seller?.rating || '5.0'} (${seller?.dealsCompleted || '0'} ta muvaffaqiyatli savdo)</span>
              </div>
            </div>

            ${seller?.telegram ? `
              <a href="https://t.me/${seller.telegram.replace('@', '')}" target="_blank" class="btn btn-outline btn-sm">
                <i class="fa-brands fa-telegram text-cyan"></i> Telegram Aloqa
              </a>
            ` : ''}
          </div>

          <div style="margin-top:20px;">
            <h5 style="margin-bottom:10px; font-size:0.95rem;">Sotuvchi haqida fikrlar:</h5>
            ${reviewsHtml}
          </div>
        </div>
      `;

      this.openModal('modal-details');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== BUY / ESCROW FLOW ====================
  async promptBuyAccount(listingId, price) {
    if (!this.requireLoginPrompt()) return;

    const userBalance = this.state.user.balance || 0;

    if (userBalance < price) {
      const diff = price - userBalance;
      const willTopup = confirm(
        `Balansingizda mablag' yetarli emas!\n\n` +
        `Akkaunt narxi: ${price.toLocaleString()} so'm\n` +
        `Sizning balansingiz: ${userBalance.toLocaleString()} so'm\n` +
        `Yetishmayotgan summa: ${diff.toLocaleString()} so'm\n\n` +
        `Hamyoningizni hozir to'ldirishni istaysizmi?`
      );

      if (willTopup) {
        this.closeModal('modal-details');
        this.openWalletModal('topup');
        document.getElementById('topup-amount').value = diff;
      }
      return;
    }

    const confirmed = confirm(
      `🛡️ XAVFSIZ GARANT BITIMI\n\n` +
      `Mablag': ${price.toLocaleString()} so'm balansingizdan olinib, platforma Garant depozitida xavfsiz muzlatiladi.\n\n` +
      `Sotuvchi sizga akkaunt login va parolini taqdim etadi. Siz o'yinga kirib to'liq tekshirib tasdiqlaganingizdan so'nggina pul sotuvchiga o'tadi!\n\n` +
      `Bitimni boshlashni tasdiqlaysizmi?`
    );

    if (!confirmed) return;

    try {
      this.showToast('Garant bitimi boshlanmoqda...', 'info');
      const res = await API.deals.start(listingId);
      
      // Update local user balance
      this.state.user.balance -= price;
      API.setUser(this.state.user);
      this.updateAuthUI();

      this.closeModal('modal-details');
      this.showToast('Bitim boshlandi! Bitim xonasi ochilmoqda...', 'success');
      
      // Navigate to deal room
      this.openDealRoom(res.dealId);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== SELL ACCOUNT (CREATE LISTING) ====================
  openSellModal() {
    if (!this.requireLoginPrompt()) return;
    this.state.uploadedImages = [];
    document.getElementById('sell-uploaded-previews').innerHTML = '';
    this.openModal('modal-sell');
  },

  async handleImageSelection(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      formData.append('photos', files[i]);
    }

    try {
      this.showToast('Rasmlar yuklanmoqda...', 'info');
      const res = await API.listings.uploadImages(formData);
      this.state.uploadedImages = res.urls;

      const previewsContainer = document.getElementById('sell-uploaded-previews');
      previewsContainer.innerHTML = res.urls.map(url => `
        <img src="${url}" class="preview-thumb">
      `).join('');

      this.showToast('Rasmlar yuklandi!', 'success');
    } catch (err) {
      this.showToast(err.message || 'Rasm yuklashda xatolik', 'error');
    }
  },

  async handleCreateListing(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-listing');

    const title = document.getElementById('sell-title').value.trim();
    const ovr = parseInt(document.getElementById('sell-ovr').value);
    const price = parseInt(document.getElementById('sell-price').value);
    const teamValue = document.getElementById('sell-team-value').value.trim();
    const coins = document.getElementById('sell-coins').value.trim();
    const gems = document.getElementById('sell-gems').value.trim();
    const fcPoints = document.getElementById('sell-fc-points').value.trim();
    const bindingType = document.getElementById('sell-binding').value;
    const formation = document.getElementById('sell-formation').value;
    const level = parseInt(document.getElementById('sell-level').value) || 25;
    const topPlayers = document.getElementById('sell-top-players').value;
    const description = document.getElementById('sell-desc').value.trim();
    const credentials = document.getElementById('sell-credentials').value.trim();

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Chop etilmoqda...';

      const listingData = {
        title,
        ovr,
        price,
        teamValue,
        coins,
        gems,
        fcPoints,
        bindingType,
        formation,
        level,
        topPlayers,
        description,
        credentials,
        images: Array.isArray(this.state.uploadedImages) && this.state.uploadedImages.length > 0 ? this.state.uploadedImages : []
      };

      await API.listings.create(listingData);

      this.closeModal('modal-sell');
      this.showToast('Akkauntingiz 24/7 savdo bozoriga muvaffaqiyatli joylashtirildi! 🎉', 'success');
      
      // Reset form
      document.getElementById('form-sell-account').reset();
      this.state.uploadedImages = [];

      this.navigate('catalog');
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> E\'lonni Chop Etish';
    }
  },

  async deleteListing(id) {
    if (!confirm('Rostdan ham ushbu e\'lonni o\'chirmoqchimisiz?')) return;
    try {
      await API.listings.delete(id);
      this.closeModal('modal-details');
      this.showToast('E\'lon muvaffaqiyatli o\'chirildi', 'success');
      this.loadListings();
      if (this.state.activeView === 'profile') {
        this.loadProfile();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== DEALS & DEAL ROOM ====================
  async updateActiveDealsCount() {
    try {
      const res = await API.deals.getAll();
      const active = (res.deals || []).filter(d => ['escrow_hold', 'credentials_sent', 'dispute'].includes(d.status));
      const badge = document.getElementById('active-deals-count');
      if (active.length > 0) {
        badge.textContent = active.length;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    } catch (e) {
      // ignore
    }
  },

  async loadDeals() {
    try {
      const res = await API.deals.getAll();
      this.state.deals = res.deals || [];
      this.renderDealsList(this.state.deals);
    } catch (err) {
      this.showToast('Bitimlarni yuklashda xatolik', 'error');
    }
  },

  filterDealsView(filter) {
    document.querySelectorAll('.deal-tab').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    let list = this.state.deals;
    if (filter === 'active') {
      list = list.filter(d => ['escrow_hold', 'credentials_sent', 'dispute'].includes(d.status));
    } else if (filter === 'completed') {
      list = list.filter(d => d.status === 'completed');
    }
    this.renderDealsList(list);
  },

  renderDealsList(deals) {
    const container = document.getElementById('deals-list-container');
    const empty = document.getElementById('deals-empty-state');

    if (!deals || deals.length === 0) {
      container.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    container.innerHTML = deals.map(d => {
      const isBuyer = this.state.user && this.state.user.id === d.buyerId;
      const roleLabel = isBuyer ? '<span class="text-cyan">[Xarid qilyapsiz]</span>' : '<span class="text-neon">[Sotyapsiz]</span>';

      let statusText = 'Garantda kutilmoqda';
      if (d.status === 'credentials_sent') statusText = 'Login yuborildi (Tekshirish)';
      if (d.status === 'completed') statusText = 'Muvaffaqiyatli yakunlandi';
      if (d.status === 'dispute') statusText = 'Arbitraj / Shikoyat';
      if (d.status === 'cancelled') statusText = 'Bekor qilingan';

      return `
        <div class="deal-item-card" onclick="app.openDealRoom('${d.id}')">
          <div class="deal-item-left">
            <div class="deal-badge-ovr">${d.listingOvr || 'FC'}</div>
            <div class="deal-info">
              <h4>${d.listingTitle} ${roleLabel}</h4>
              <div class="deal-meta">
                <span>Bitim ID: #${d.id.substr(0, 8)}</span>
                <span>•</span>
                <span>${new Date(d.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>Hamkor: @${isBuyer ? d.sellerName : d.buyerName}</span>
              </div>
            </div>
          </div>

          <div class="deal-item-right">
            <span class="deal-status-pill ${d.status}">${statusText}</span>
            <div class="deal-price-val">${(d.price || 0).toLocaleString()} so'm</div>
            <i class="fa-solid fa-chevron-right text-muted"></i>
          </div>
        </div>
      `;
    }).join('');
  },

  async openDealRoom(dealId) {
    if (!this.requireLoginPrompt()) return;

    try {
      this.showToast('Bitim xonasi ochilmoqda...', 'info');
      const res = await API.deals.getById(dealId);
      this.state.currentDeal = res.deal;

      this.renderDealRoom(res.deal);
      this.navigate('deal-room');
      window.location.hash = `deal-${dealId}`;

      // Start periodic poll for deal messages
      if (this.state.dealPollInterval) clearInterval(this.state.dealPollInterval);
      this.state.dealPollInterval = setInterval(async () => {
        if (this.state.activeView === 'deal-room' && this.state.currentDeal?.id === dealId) {
          try {
            const updated = await API.deals.getById(dealId);
            this.state.currentDeal = updated.deal;
            this.renderDealRoomMessages(updated.deal);
          } catch (e) {
            // silent
          }
        } else {
          clearInterval(this.state.dealPollInterval);
        }
      }, 3500);

    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  renderDealRoom(deal) {
    const container = document.getElementById('deal-room-container');
    const isBuyer = this.state.user.id === deal.buyerId;
    const isSeller = this.state.user.id === deal.sellerId;
    const isAdmin = this.state.user.role === 'admin';

    // Step state
    const isStep1Done = true;
    const isStep2Done = ['credentials_sent', 'completed'].includes(deal.status);
    const isStep3Done = deal.status === 'completed';

    container.innerHTML = `
      <!-- Left sidebar: Deal stats & Controls -->
      <div class="deal-sidebar-card">
        <span style="font-size:0.75rem; color:#00ff87; font-weight:700; text-transform:uppercase;">
          <i class="fa-solid fa-shield-halved"></i> Garant Himoyasi # ${deal.id.substr(0, 8)}
        </span>
        <h3 style="font-size:1.15rem; margin:6px 0 12px;">${deal.listingTitle}</h3>

        <div style="background:#162032; padding:12px; border-radius:8px; margin-bottom:16px;">
          <div style="font-size:0.8rem; color:#8b9bb4;">Bitim summasi:</div>
          <div style="font-family:'Chakra Petch'; font-size:1.6rem; font-weight:800; color:#00ff87;">
            ${(deal.price || 0).toLocaleString()} so'm
          </div>
          <div style="font-size:0.75rem; color:#8b9bb4; margin-top:2px;">
            ${isBuyer ? 'Mablag\'ingiz Garantda xavfsiz saqlanmoqda' : 'Xaridor pul to\'lagan va Garantda muzlatilgan'}
          </div>
        </div>

        <!-- Deal status timeline -->
        <h5 style="font-size:0.9rem; margin-bottom:10px;">Bitim Bosqichlari:</h5>
        <div class="deal-timeline">
          <div class="t-step ${isStep1Done ? 'completed' : 'active'}">
            <div class="t-circle"><i class="fa-solid fa-check"></i></div>
            <div class="t-content">
              <h5>1. Mablag' Muzlatildi</h5>
              <p>Garant xaridorni tasdiqladi</p>
            </div>
          </div>
          <div class="t-step ${isStep2Done ? 'completed' : (deal.status === 'escrow_hold' ? 'active' : '')}">
            <div class="t-circle">${isStep2Done ? '<i class="fa-solid fa-check"></i>' : '2'}</div>
            <div class="t-content">
              <h5>2. Login & Parol Topshirish</h5>
              <p>Sotuvchi ma'lumotlarni beradi</p>
            </div>
          </div>
          <div class="t-step ${isStep3Done ? 'completed' : ''}">
            <div class="t-circle">${isStep3Done ? '<i class="fa-solid fa-check"></i>' : '3'}</div>
            <div class="t-content">
              <h5>3. Tekshirish va Yakunlash</h5>
              <p>Xaridor tasdiqlaydi va pul o'tadi</p>
            </div>
          </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div style="margin-top:24px; display:flex; flex-direction:column; gap:10px;">
          ${isSeller && deal.status === 'escrow_hold' ? `
            <button class="btn btn-primary btn-block" onclick="app.promptSellerSendCredentials('${deal.id}')">
              <i class="fa-solid fa-key"></i> Login va Parolni Yuborish
            </button>
          ` : ''}

          ${isBuyer && (deal.status === 'credentials_sent' || deal.status === 'escrow_hold') ? `
            <button class="btn btn-primary btn-block btn-lg" onclick="app.confirmDealAndRelease('${deal.id}')">
              <i class="fa-solid fa-circle-check"></i> Akkauntni Qabul Qildim (Pulni topshirish)
            </button>
          ` : ''}

          ${(deal.status === 'escrow_hold' || deal.status === 'credentials_sent') ? `
            <button class="btn btn-outline btn-block text-danger" onclick="app.promptDispute('${deal.id}')">
              <i class="fa-solid fa-triangle-exclamation"></i> Arbitraj / Shikoyat Qilish
            </button>
          ` : ''}

          ${deal.status === 'completed' && isBuyer ? `
            <button class="btn btn-outline btn-block text-gold" onclick="app.promptLeaveReview('${deal.id}')">
              <i class="fa-solid fa-star"></i> Sotuvchiga Baho Berish
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Right main: Deal Chat Room -->
      <div class="deal-chat-card">
        <div class="chat-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <i class="fa-solid fa-comments text-neon"></i>
            <h4>Garant & Bitim Chati</h4>
          </div>
          <span class="deal-status-pill ${deal.status}">${deal.status.toUpperCase()}</span>
        </div>

        <div class="chat-messages-area" id="deal-chat-messages">
          <!-- messages -->
        </div>

        <form class="chat-input-bar" onsubmit="app.handleSendDealMessage(event, '${deal.id}')">
          <input type="text" id="deal-msg-input" placeholder="Xabar yozing (Sotuvchi va Xaridorga ko'rinadi)..." autocomplete="off" required>
          <button type="submit" class="btn btn-primary">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>
    `;

    this.renderDealRoomMessages(deal);
  },

  renderDealRoomMessages(deal) {
    const msgContainer = document.getElementById('deal-chat-messages');
    if (!msgContainer) return;

    const messages = deal.messages || [];
    msgContainer.innerHTML = messages.map(m => {
      let roleClass = m.sender;
      if (m.isCredential) roleClass += ' credential-msg';

      return `
        <div class="msg-bubble ${roleClass}">
          <div class="msg-sender">${m.senderName || 'Ishtirokchi'}</div>
          <div style="white-space: pre-wrap;">${m.text}</div>
          <div class="msg-time">${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      `;
    }).join('');

    msgContainer.scrollTop = msgContainer.scrollHeight;
  },

  async handleSendDealMessage(e, dealId) {
    e.preventDefault();
    const input = document.getElementById('deal-msg-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    try {
      await API.deals.sendMessage(dealId, text);
      const updated = await API.deals.getById(dealId);
      this.state.currentDeal = updated.deal;
      this.renderDealRoomMessages(updated.deal);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async promptSellerSendCredentials(dealId) {
    const creds = prompt("Akkaunt login va parolini xaridorga yuborish uchun kiriting:\n(Masalan: Pochta: account@ea.com | Parol: secret123)");
    if (!creds || creds.trim().length === 0) return;

    try {
      this.showToast('Ma\'lumotlar yuborilmoqda...', 'info');
      await API.deals.sendCredentials(dealId, creds.trim());
      this.showToast('Akkaunt ma\'lumotlari xaridorga yetkazildi!', 'success');
      
      const updated = await API.deals.getById(dealId);
      this.state.currentDeal = updated.deal;
      this.renderDealRoom(updated.deal);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async confirmDealAndRelease(dealId) {
    const confirmed = confirm(
      "DIQQAT! Akkauntga kirib barcha ma'lumotlarni tekshirganingizga va parollarni o'zgartirganingizga ishonchingiz komilmi?\n\n" +
      "Tasdiqlaganingizdan so'ng pul Garant hisobidan to'g'ridan-to'g'ri sotuvchiga o'tkaziladi va bu amalni bekor qilib bo'lmaydi!"
    );

    if (!confirmed) return;

    try {
      this.showToast('Bitim yakunlanmoqda...', 'info');
      await API.deals.confirm(dealId);
      this.showToast('Tabriklaymiz! Bitim muvaffaqiyatli yakunlandi va pul sotuvchiga topshirildi 🎉', 'success');

      const updated = await API.deals.getById(dealId);
      this.state.currentDeal = updated.deal;
      this.renderDealRoom(updated.deal);

      // Prompt to leave review
      setTimeout(() => {
        this.promptLeaveReview(dealId);
      }, 1000);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async promptDispute(dealId) {
    const reason = prompt("Arbitraj / Shikoyat sababini yozing (Masalan: Akkaunt ma'lumotlari noto'g'ri):");
    if (!reason || reason.trim().length === 0) return;

    try {
      await API.deals.dispute(dealId, reason.trim());
      this.showToast('Shikoyat qabul qilindi. Bitim to\'xtatildi va platforma moderatori aralashmoqda.', 'info');
      const updated = await API.deals.getById(dealId);
      this.state.currentDeal = updated.deal;
      this.renderDealRoom(updated.deal);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async promptLeaveReview(dealId) {
    const ratingStr = prompt("Sotuvchiga baho bering (1 dan 5 gacha yulduz):", "5");
    if (!ratingStr) return;
    const rating = parseInt(ratingStr) || 5;
    const comment = prompt("Sotuvchi va xizmat haqida qisqa sharhingizni yozing:", "Juda tez va ishonchli, rahmat!");

    try {
      await API.deals.leaveReview(dealId, rating, comment);
      this.showToast('Fikringiz uchun rahmat!', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== WALLET & TRANSACTIONS ====================
  openWalletModal(tab = 'topup') {
    if (!this.requireLoginPrompt()) return;
    document.getElementById('modal-wallet-amount').textContent = (this.state.user.balance || 0).toLocaleString() + " so'm";
    this.switchWalletTab(tab);

    document.querySelectorAll('.pay-method-card').forEach(card => {
      card.onclick = () => {
        document.querySelectorAll('.pay-method-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      };
    });

    this.openModal('modal-wallet');
  },

  switchWalletTab(tab) {
    const topupBtn = document.getElementById('wtab-topup');
    const transferBtn = document.getElementById('wtab-transfer');
    const withdrawBtn = document.getElementById('wtab-withdraw');
    const formTopup = document.getElementById('form-topup');
    const formTransfer = document.getElementById('form-transfer');
    const formWithdraw = document.getElementById('form-withdraw');

    topupBtn?.classList.remove('active');
    transferBtn?.classList.remove('active');
    withdrawBtn?.classList.remove('active');
    if (formTopup) formTopup.style.display = 'none';
    if (formTransfer) formTransfer.style.display = 'none';
    if (formWithdraw) formWithdraw.style.display = 'none';

    if (tab === 'topup') {
      topupBtn?.classList.add('active');
      if (formTopup) formTopup.style.display = 'block';
    } else if (tab === 'transfer') {
      transferBtn?.classList.add('active');
      if (formTransfer) formTransfer.style.display = 'block';
    } else {
      withdrawBtn?.classList.add('active');
      if (formWithdraw) formWithdraw.style.display = 'block';
    }
  },

  setTopupAmount(amt) {
    document.getElementById('topup-amount').value = amt;
  },

  setTransferAmount(amt) {
    document.getElementById('transfer-amount').value = amt;
  },

  async handleTopup(e) {
    e.preventDefault();
    const rawVal = document.getElementById('topup-amount').value;
    const amount = parseInt(String(rawVal || '').replace(/[\s,\.]/g, ''), 10);
    const provider = document.querySelector('input[name="topup-provider"]:checked')?.value || 'Payme';
    const btn = document.getElementById('btn-submit-topup');

    if (isNaN(amount) || amount < 1000) {
      this.showToast('Minimal to\'ldirish summasi 1,000 so\'m', 'error');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> To\'lov amalga oshirilmoqda...';

      const res = await API.wallet.topup(amount, provider);
      this.state.user.balance = res.newBalance;
      API.setUser(this.state.user);

      this.updateAuthUI();
      this.closeModal('modal-wallet');
      this.showToast(res.message, 'success');

      if (this.state.activeView === 'profile') {
        this.loadProfile();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> Hisobni To\'ldirish';
    }
  },

  async handleTransfer(e) {
    e.preventDefault();
    const recipient = document.getElementById('transfer-recipient').value.trim();
    const rawVal = document.getElementById('transfer-amount').value;
    const amount = parseInt(String(rawVal || '').replace(/[\s,\.]/g, ''), 10);
    const btn = document.getElementById('btn-submit-transfer');

    if (!recipient) {
      this.showToast('Qabul qiluvchining username yoki pochtasini kiriting', 'error');
      return;
    }

    if (isNaN(amount) || amount < 1000) {
      this.showToast('Minimal o\'tkazish summasi 1,000 so\'m', 'error');
      return;
    }

    if ((this.state.user.balance || 0) < amount) {
      this.showToast('Balansingizda mablag\' yetarli emas!', 'error');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> O\'tkazilmoqda...';

      const res = await API.wallet.transfer(recipient, amount);
      this.state.user.balance = res.newBalance;
      API.setUser(this.state.user);

      this.updateAuthUI();
      this.closeModal('modal-wallet');
      this.showToast(res.message, 'success');

      if (this.state.activeView === 'profile') {
        this.loadProfile();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Pulni O\'tkazish';
    }
  },

  async handleWithdraw(e) {
    e.preventDefault();
    const rawVal = document.getElementById('withdraw-amount').value;
    const amount = parseInt(String(rawVal || '').replace(/[\s,\.]/g, ''), 10);
    const cardNumber = document.getElementById('withdraw-card').value.trim();
    const cardHolder = document.getElementById('withdraw-holder').value.trim();
    const btn = document.getElementById('btn-submit-withdraw');

    if (isNaN(amount) || amount < 10000) {
      this.showToast('Minimal yechib olish summasi 10,000 so\'m', 'error');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yuborilmoqda...';

      const res = await API.wallet.withdraw(amount, cardNumber, cardHolder);
      this.state.user.balance = res.newBalance;
      API.setUser(this.state.user);

      this.updateAuthUI();
      this.closeModal('modal-wallet');
      this.showToast(res.message, 'success');

      if (this.state.activeView === 'profile') {
        this.loadProfile();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Kartaga Yechib Olish';
    }
  },

  // ==================== PROFILE ====================
  async loadProfile() {
    if (!this.state.user) return;

    try {
      const res = await API.auth.me();
      this.state.user = res.user;
      API.setUser(res.user);

      document.getElementById('prof-avatar').src = this.state.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
      document.getElementById('prof-username').textContent = this.state.user.username;
      document.getElementById('prof-role').textContent = this.state.user.role === 'admin' ? '🛡️ Admin' : 'Sotuvchi & Xaridor';
      document.getElementById('prof-rating').textContent = this.state.user.rating || '5.0';
      document.getElementById('prof-deals').textContent = this.state.user.dealsCompleted || '0';
      document.getElementById('prof-reviews').textContent = this.state.user.reviewCount || '0';
      document.getElementById('prof-email').textContent = this.state.user.email;
      document.getElementById('prof-telegram').textContent = this.state.user.telegram || 'Ko\'rsatilmagan';
      document.getElementById('prof-phone').textContent = this.state.user.phone || 'Ko\'rsatilmagan';
      document.getElementById('prof-balance-amount').textContent = (this.state.user.balance || 0).toLocaleString() + " so'm";

      this.loadMyListings();
      this.loadTransactions();
    } catch (err) {
      this.showToast('Profilni yuklashda xatolik', 'error');
    }
  },

  switchProfileSubtab(tab) {
    document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.subtab-view').forEach(v => v.classList.remove('active'));

    if (tab === 'listings') {
      document.querySelector('.subtab-btn:nth-child(1)')?.classList.add('active');
      document.getElementById('subtab-listings')?.classList.add('active');
      this.loadMyListings();
    } else {
      document.querySelector('.subtab-btn:nth-child(2)')?.classList.add('active');
      document.getElementById('subtab-transactions')?.classList.add('active');
      this.loadTransactions();
    }
  },

  async loadMyListings() {
    const container = document.getElementById('my-listings-container');
    try {
      const res = await API.listings.getAll({ sellerId: this.state.user.id, status: 'all' });
      const items = res.listings || [];

      if (items.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align:center; padding:30px; color:#8b9bb4;">
            <p>Siz hali hech qanday akkauntni sotuvga qo'ymagansiz.</p>
            <button class="btn btn-primary btn-sm mt-2" onclick="app.openSellModal()">
              <i class="fa-solid fa-plus"></i> E'lon Berish
            </button>
          </div>
        `;
        return;
      }

      container.innerHTML = items.map(item => `
        <div style="background:#101726; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:45px; height:45px; border-radius:8px; background:#1b263b; border:1px solid #ffb800; display:flex; align-items:center; justify-content:center; font-family:'Chakra Petch'; font-size:1.2rem; font-weight:800; color:#fff;">
              ${item.ovr}
            </div>
            <div>
              <h4 style="margin:0 0 4px; font-size:1rem;">${item.title}</h4>
              <span style="font-size:0.8rem; color:#8b9bb4;">Narx: <b>${item.price.toLocaleString()} so'm</b> | Holat: <b style="color:#00ff87;">${item.status}</b></span>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline btn-sm" onclick="app.openListingDetails('${item.id}')">Ko'rish</button>
            <button class="btn btn-danger btn-sm" onclick="app.deleteListing('${item.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      // ignore
    }
  },

  async loadTransactions() {
    const tbody = document.getElementById('transactions-tbody');
    try {
      const res = await API.wallet.getTransactions();
      const list = res.transactions || [];

      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#8b9bb4; padding:20px;">Hali tranzaksiyalar yo\'q</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(tx => {
        const isPositive = tx.amount > 0;
        return `
          <tr>
            <td>${new Date(tx.createdAt).toLocaleDateString()} ${new Date(tx.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'})}</td>
            <td><span style="text-transform:uppercase; font-size:0.75rem; font-weight:700;">${tx.type}</span></td>
            <td style="font-weight:700; color:${isPositive ? '#00ff87' : '#ff3b5c'};">
              ${isPositive ? '+' : ''}${tx.amount.toLocaleString()} so'm
            </td>
            <td>${tx.description}</td>
            <td><span class="text-green" style="font-size:0.8rem; font-weight:600;"><i class="fa-solid fa-circle-check"></i> Bajarildi</span></td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      // ignore
    }
  },

  openEditProfileModal() {
    document.getElementById('edit-phone').value = this.state.user.phone || '';
    document.getElementById('edit-telegram').value = this.state.user.telegram || '';
    document.getElementById('edit-avatar').value = this.state.user.avatar || '';
    this.openModal('modal-edit-profile');
  },

  async handleUpdateProfile(e) {
    e.preventDefault();
    const phone = document.getElementById('edit-phone').value.trim();
    const telegram = document.getElementById('edit-telegram').value.trim();
    const avatar = document.getElementById('edit-avatar').value.trim();

    try {
      const res = await API.auth.updateProfile({ phone, telegram, avatar });
      this.state.user = res.user;
      API.setUser(res.user);
      this.updateAuthUI();
      this.closeModal('modal-edit-profile');
      this.showToast('Profil ma\'lumotlari yangilandi!', 'success');
      this.loadProfile();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== ADMIN DASHBOARD ====================
  async loadAdminData() {
    try {
      const stats = await API.admin.getStats();
      const kpiContainer = document.getElementById('admin-kpi-container');

      kpiContainer.innerHTML = `
        <div class="feat-card" style="border-color: rgba(0, 255, 135, 0.4);">
          <i class="fa-solid fa-chart-line text-neon"></i>
          <div>
            <h4>Umumiy Aylanma</h4>
            <p style="font-family:'Chakra Petch'; font-size:1.4rem; font-weight:800; color:#00ff87;">
              ${(stats.totalVolume || 0).toLocaleString()} so'm
            </p>
          </div>
        </div>

        <div class="feat-card">
          <i class="fa-solid fa-users text-cyan"></i>
          <div>
            <h4>Foydalanuvchilar</h4>
            <p style="font-family:'Chakra Petch'; font-size:1.4rem; font-weight:800; color:#fff;">
              ${stats.totalUsers} ta
            </p>
          </div>
        </div>

        <div class="feat-card">
          <i class="fa-solid fa-gamepad text-gold"></i>
          <div>
            <h4>Faol E'lonlar</h4>
            <p style="font-family:'Chakra Petch'; font-size:1.4rem; font-weight:800; color:#fff;">
              ${stats.activeListings} / ${stats.totalListings} ta
            </p>
          </div>
        </div>

        <div class="feat-card">
          <i class="fa-solid fa-handshake text-green"></i>
          <div>
            <h4>Tugallangan Bitimlar</h4>
            <p style="font-family:'Chakra Petch'; font-size:1.4rem; font-weight:800; color:#fff;">
              ${stats.completedDeals} ta
            </p>
          </div>
        </div>
      `;

      this.loadAdminUsers();
      this.loadAdminListings();
      this.loadAdminDisputes();
    } catch (err) {
      this.showToast('Admin ma\'lumotlarini yuklashda xatolik', 'error');
    }
  },

  switchAdminTab(tab) {
    document.querySelectorAll('.adm-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.adm-tab-panel').forEach(p => p.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`adm-content-${tab}`)?.classList.add('active');
  },

  async loadAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    try {
      const res = await API.admin.getUsers();
      const users = res.users || [];

      tbody.innerHTML = users.map(u => `
        <tr>
          <td><b>@${u.username}</b></td>
          <td>${u.email}</td>
          <td><span style="text-transform:uppercase; font-size:0.75rem;">${u.role}</span></td>
          <td style="color:#00ff87; font-weight:700;">${(u.balance || 0).toLocaleString()} so'm</td>
          <td>${u.dealsCompleted || 0}</td>
          <td>${u.isVerified ? '<span class="text-neon">✓ Ha</span>' : '<span class="text-muted">Yo\'q</span>'}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="app.adminAddBalance('${u.id}', 100000)">+100k test</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      // ignore
    }
  },

  async adminAddBalance(userId, delta) {
    try {
      await API.admin.updateUser(userId, { balanceDelta: delta });
      this.showToast('Balans yangilandi!', 'success');
      this.loadAdminUsers();
    } catch (e) {
      this.showToast('Xatolik', 'error');
    }
  },

  async loadAdminListings() {
    const tbody = document.getElementById('admin-listings-tbody');
    try {
      const res = await API.listings.getAll({ status: 'all' });
      const items = res.listings || [];

      tbody.innerHTML = items.map(l => `
        <tr>
          <td><b>${l.title}</b></td>
          <td><span class="text-gold" style="font-weight:700;">${l.ovr} OVR</span></td>
          <td>${(l.price || 0).toLocaleString()} so'm</td>
          <td>@${l.sellerName}</td>
          <td><span style="font-size:0.8rem; text-transform:uppercase;">${l.status}</span></td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="app.deleteListing('${l.id}')">O'chirish</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      // ignore
    }
  },

  async loadAdminDisputes() {
    const container = document.getElementById('admin-disputes-container');
    try {
      const res = await API.deals.getAll();
      const disputes = (res.deals || []).filter(d => d.status === 'dispute');

      if (disputes.length === 0) {
        container.innerHTML = '<div style="padding:24px; text-align:center; color:#8b9bb4;">Hozirda hech qanday hal qilinmagan shikoyat yoki nizolar yo\'q 🎉</div>';
        return;
      }

      container.innerHTML = disputes.map(d => `
        <div style="background:#162032; border:1px solid #ff3b5c; border-radius:12px; padding:20px; margin-bottom:16px;">
          <h4>Nizoli bitim #${d.id.substr(0, 8)}: ${d.listingTitle}</h4>
          <p style="font-size:0.9rem; color:#8b9bb4; margin:6px 0 14px;">
            Xaridor: <b>@${d.buyerName}</b> | Sotuvchi: <b>@${d.sellerName}</b> | Summa: <b>${(d.price || 0).toLocaleString()} so'm</b>
          </p>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-primary btn-sm" onclick="app.adminResolveDispute('${d.id}', 'release_seller')">
              Pulni Sotuvchiga Berish
            </button>
            <button class="btn btn-danger btn-sm" onclick="app.adminResolveDispute('${d.id}', 'refund_buyer')">
              Pulni Xaridorga Qaytarish
            </button>
            <button class="btn btn-outline btn-sm" onclick="app.openDealRoom('${d.id}')">
              Chatni Ko'rish
            </button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      // ignore
    }
  },

  async adminResolveDispute(dealId, decision) {
    const reason = prompt("Qaror asosi va sababi:");
    if (!reason) return;

    try {
      await API.admin.resolveDispute(dealId, decision, reason);
      this.showToast('Nizo hal qilindi!', 'success');
      this.loadAdminData();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== UI HELPERS & MODALS ====================
  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle text-cyan';
    if (type === 'success') icon = 'fa-circle-check text-neon';
    if (type === 'error') icon = 'fa-circle-exclamation text-danger';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span style="flex:1;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

// Window click listener to close dropdowns when clicking outside
window.addEventListener('click', (e) => {
  if (!e.target.closest('.user-dropdown-container')) {
    document.getElementById('user-dropdown-menu')?.classList.remove('show');
  }
});

// Close modal on escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
  }
});

// Start app on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
