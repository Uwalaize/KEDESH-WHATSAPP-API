<template>
  <div class="dashboard-layout premium-ui">

    <!-- MODAL YA KUONGEZA SALIO -->
    <transition name="fade">
      <div v-if="showTopupModal" class="modal-overlay" @click.self="showTopupModal = false">
        <div class="modal-card glass-panel">
          <div class="modal-header">
            <div class="modal-header-content">
              <span class="modal-icon">💳</span>
              <h3>Weka Salio kwenye Akaunti</h3>
            </div>
            <button class="close-btn" @click="showTopupModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="wallet-icon-large floating-anim">💰</div>
            <h2 class="modal-title">Lipa na Ongeza Salio</h2>
            <p class="modal-description">
              Fanya malipo kupitia namba ya ofisi hapa chini. Baada ya muamala kukamilika, wasiliana na Admin ili kupandishiwa salio lako papo hapo.
            </p>

            <div class="payment-methods">
              <div class="payment-method active-method">
                <span class="method-icon">📱</span>
                <div>
                  <strong>M-Pesa / TigoPesa / Airtel Money</strong>
                  <p>Lipa kwa namba ya kampuni</p>
                </div>
              </div>
            </div>

            <div class="contact-admin gradient-border">
              <div class="contact-row">
                <span class="contact-label">Namba ya Malipo:</span>
                <strong class="contact-value highlight-text">0667 961 231</strong>
              </div>
              <div class="contact-row">
                <span class="contact-label">Jina la Kampuni:</span>
                <strong class="contact-value">KEDESH LIMITED</strong>
              </div>
            </div>

            <div class="alert-box info-premium mt-4">
              <span class="a-icon">💡</span>
              <div>
                <strong>Muhimu:</strong>
                <p>Baada ya kutuma malipo, tafadhali wasiliana na Admin kupitia WhatsApp au simu ili kusasisha salio lako mara moja.</p>
              </div>
            </div>

            <button class="btn-primary-premium full-width mt-4" @click="showTopupModal = false">
              ✅ Sawa, Nimeelewa
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- MENU YA PEMBENI (SIDEBAR) -->
    <aside class="sidebar premium-sidebar">
      <div class="sidebar-inner">
        <div class="brand">
          <div class="brand-logo-wrapper">
            <img src="/logo/image.png" alt="Kedesh Limited" class="brand-logo" />
          </div>
          <div class="brand-text">
            <h2>{{ userData?.businessName || 'KEDESH LIMITED' }}</h2>
            <span class="brand-badge premium-badge">WhatsApp API</span>
          </div>
        </div>

        <div class="nav-menu custom-scrollbar">
          <p class="menu-label">MENU KUU</p>
          <button :class="['nav-btn', { 'active-nav': currentView === 'home' }]" @click="currentView = 'home'">
            <span class="nav-icon">📊</span>
            <span class="nav-text">Muhtasari</span>
            <span class="nav-arrow" v-if="currentView === 'home'">›</span>
          </button>
          <button :class="['nav-btn', { 'active-nav': currentView === 'bulk' }]" @click="currentView = 'bulk'">
            <span class="nav-icon">🚀</span>
            <span class="nav-text">Bulk SMS</span>
            <span class="nav-arrow" v-if="currentView === 'bulk'">›</span>
          </button>
          <button :class="['nav-btn', { 'active-nav': currentView === 'chat' }]" @click="currentView = 'chat'">
            <span class="nav-icon">💬</span>
            <span class="nav-text">Live Chat</span>
            <span v-if="totalUnread > 0" class="unread-badge-sidebar heartbeat">{{ totalUnread }}</span>
            <span class="nav-arrow" v-if="currentView === 'chat'">›</span>
          </button>

          <p class="menu-label mt-4">MIPANGILIO</p>
          <button :class="['nav-btn', { 'active-nav': currentView === 'settings' }]" @click="currentView = 'settings'">
            <span class="nav-icon">⚙️</span>
            <span class="nav-text">API & Akaunti</span>
            <span class="nav-arrow" v-if="currentView === 'settings'">›</span>
          </button>
        </div>

        <div class="sidebar-footer">
          <div class="wallet-card-mini premium-wallet">
            <div class="wallet-top">
              <span class="wallet-label">💰 Salio Lako</span>
              <span class="wallet-currency">TZS</span>
            </div>
            <h3 class="wallet-amount">{{ formatMoney(userData?.walletBalance) }}</h3>
            <button class="topup-btn-premium" @click="showTopupModal = true">
              <span>➕</span> Weka Salio
            </button>
          </div>

          <div class="user-profile-mini">
            <div class="user-avatar-gradient">{{ userData?.businessName?.charAt(0).toUpperCase() || 'K' }}</div>
            <div class="user-details">
              <h4>{{ userData?.businessName || 'Biashara Yangu' }}</h4>
              <p>+{{ userData?.phone || 'Namba haipo' }}</p>
            </div>
            <button @click="$emit('logout')" class="logout-icon-btn" title="Toka">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <!-- HEADER YA JUU -->
      <header class="topbar premium-topbar">
        <div class="topbar-left">
          <div class="page-title">
            <h1>{{ pageTitle }}</h1>
            <p class="date-text text-muted">{{ currentDate }}</p>
          </div>
        </div>
        <div class="topbar-right">
          <!-- Socket Connection Status -->
          <div class="status-indicator" :class="isSocketConnected ? 'connected' : 'disconnected'" title="Hali ya Muunganisho">
            <span class="status-dot"></span>
            <span class="status-text hidden-mobile">{{ isSocketConnected ? 'Live' : 'Offline' }}</span>
          </div>

          <!-- API Status -->
          <div class="status-indicator" :class="(userData?.whatsappPhoneId && userData?.wabaId) ? 'connected' : 'warning'" title="Hali ya API ya WhatsApp">
            <span class="status-dot"></span>
            <span class="status-text hidden-mobile">{{ (userData?.whatsappPhoneId && userData?.wabaId) ? 'API Active' : 'Setup Required' }}</span>
          </div>

          <button @click="$emit('logout')" class="logout-btn-top hidden-mobile">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Toka
          </button>
        </div>
      </header>

      <div class="content-area custom-scrollbar bg-slate-50">
        <transition name="fade-slide" mode="out-in">

          <!-- ======================== HOME VIEW ======================== -->
          <div v-if="currentView === 'home'" key="home" class="view-panel fade-in">
            <!-- ONYO LA SETUP -->
            <div v-if="!userData?.wabaId || !userData?.whatsappPhoneId" class="setup-banner premium-alert-warning">
              <div class="setup-icon">⚠️</div>
              <div class="setup-content">
                <h3>Akaunti Yako Haijakamilika</h3>
                <p>Mfumo haujaweza kupata WABA ID au Phone ID yako. Tafadhali toka nje na uingie tena kupitia Facebook ili kukamilisha usajili.</p>
                <div class="setup-actions">
                  <button class="btn-setup" @click="currentView = 'settings'">Angalia Mipangilio →</button>
                  <button class="btn-setup-secondary" @click="$emit('logout')">Ingia Upya</button>
                </div>
              </div>
            </div>

            <!-- WELCOME BANNER -->
            <div class="welcome-banner premium-gradient-bg shadow-xl">
              <div class="banner-content">
                <div class="banner-text-section">
                  <div class="greeting-badge glass-badge">
                    <span class="wave-emoji">👋</span> Karibu
                  </div>
                  <h2 class="text-4xl font-extrabold tracking-tight">{{ userData?.fullName?.split(' ')[0] || userData?.businessName || 'Kiongozi' }}!</h2>
                  <p class="text-lg opacity-90 mt-2 max-w-xl">Huu ni mfumo wako wa kisasa wa kudhibiti mawasiliano ya WhatsApp. Tuma Bulk SMS na jibu wateja wako kwa urahisi na usalama wa hali ya juu.</p>

                  <div class="banner-stats glass-panel-light mt-6">
                    <div class="banner-stat-item">
                      <span class="banner-stat-number text-2xl font-bold">84</span>
                      <span class="banner-stat-label text-xs uppercase tracking-wider">TZS/SMS</span>
                    </div>
                    <div class="banner-stat-divider"></div>
                    <div class="banner-stat-item">
                      <span class="banner-stat-number text-2xl font-bold">30</span>
                      <span class="banner-stat-label text-xs uppercase tracking-wider">TZS/Chat</span>
                    </div>
                    <div class="banner-stat-divider"></div>
                    <div class="banner-stat-item">
                      <span class="banner-stat-number text-2xl font-bold">24/7</span>
                      <span class="banner-stat-label text-xs uppercase tracking-wider">Support</span>
                    </div>
                  </div>
                </div>
                <div class="banner-illustration hidden-tablet">
                  <div class="illustration-circle glass-circle">
                    <span class="illustration-icon">📈</span>
                  </div>
                  <div class="illustration-floating floating-1">💬</div>
                  <div class="illustration-floating floating-2">🚀</div>
                  <div class="illustration-floating floating-3">✅</div>
                </div>
              </div>
              <button class="btn-banner-premium mt-4" @click="currentView = 'bulk'" :disabled="!userData?.wabaId">
                🚀 Anza Kampeni Mpya
              </button>
            </div>

            <!-- STATS GRID -->
            <div class="stats-grid">
              <div class="stat-card premium-card hover-lift">
                <div class="stat-card-inner">
                  <div class="stat-icon-wrapper bg-blue-100 text-blue-600">
                    <span class="stat-icon-emoji">📨</span>
                  </div>
                  <div class="stat-info">
                    <h3 v-if="isLoadingStats" class="stat-loading">...</h3>
                    <h3 v-else class="stat-number text-3xl font-black text-slate-800">{{ formatMoney(totalSent) }}</h3>
                    <p class="stat-label-text text-sm font-semibold text-slate-500 uppercase tracking-wide">Jumla ya SMS</p>
                  </div>
                </div>
              </div>

              <div class="stat-card premium-card hover-lift">
                <div class="stat-card-inner">
                  <div class="stat-icon-wrapper bg-emerald-100 text-emerald-600">
                    <span class="stat-icon-emoji">✅</span>
                  </div>
                  <div class="stat-info">
                    <h3 v-if="isLoadingStats" class="stat-loading">...</h3>
                    <h3 v-else class="stat-number text-3xl font-black text-slate-800">{{ formatMoney(totalDelivered) }}</h3>
                    <p class="stat-label-text text-sm font-semibold text-slate-500 uppercase tracking-wide">Zilizofika</p>
                  </div>
                </div>
              </div>

              <div class="stat-card premium-card hover-lift">
                <div class="stat-card-inner">
                  <div class="stat-icon-wrapper bg-amber-100 text-amber-600">
                    <span class="stat-icon-emoji">👥</span>
                  </div>
                  <div class="stat-info">
                    <h3 v-if="isLoadingStats" class="stat-loading">...</h3>
                    <h3 v-else class="stat-number text-3xl font-black text-slate-800">{{ formatMoney(totalContacts) }}</h3>
                    <p class="stat-label-text text-sm font-semibold text-slate-500 uppercase tracking-wide">Wateja Wote</p>
                  </div>
                </div>
              </div>

              <div class="stat-card premium-card hover-lift">
                <div class="stat-card-inner">
                  <div class="stat-icon-wrapper bg-rose-100 text-rose-600">
                    <span class="stat-icon-emoji">❌</span>
                  </div>
                  <div class="stat-info">
                    <h3 v-if="isLoadingStats" class="stat-loading">...</h3>
                    <h3 v-else class="stat-number text-3xl font-black text-slate-800">{{ formatMoney(totalFailed) }}</h3>
                    <p class="stat-label-text text-sm font-semibold text-slate-500 uppercase tracking-wide">Zilizofeli</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- QUICK ACTIONS -->
            <div class="quick-actions mt-10">
              <h3 class="section-title text-xl font-bold text-slate-800 mb-6">Vitendo vya Haraka</h3>
              <div class="action-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="action-card premium-action-card" @click="currentView = 'bulk'">
                  <div class="action-icon-top text-indigo-500">🚀</div>
                  <h4 class="font-bold text-slate-800 mt-4">Tuma Bulk SMS</h4>
                  <p class="text-sm text-slate-500 mt-1">Fikia wateja wengi kwa wakati mmoja</p>
                </div>
                <div class="action-card premium-action-card" @click="currentView = 'chat'">
                  <div class="action-icon-top text-emerald-500">💬</div>
                  <h4 class="font-bold text-slate-800 mt-4">Jibu Wateja</h4>
                  <p class="text-sm text-slate-500 mt-1">Endelea na mazungumzo live</p>
                </div>
                <div class="action-card premium-action-card" @click="showTopupModal = true">
                  <div class="action-icon-top text-amber-500">💰</div>
                  <h4 class="font-bold text-slate-800 mt-4">Ongeza Salio</h4>
                  <p class="text-sm text-slate-500 mt-1">Pandisha salio kuendelea kutuma</p>
                </div>
                <div class="action-card premium-action-card" @click="currentView = 'settings'">
                  <div class="action-icon-top text-slate-500">⚙️</div>
                  <h4 class="font-bold text-slate-800 mt-4">Mipangilio</h4>
                  <p class="text-sm text-slate-500 mt-1">Angalia API na akaunti yako</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ======================== BULK SMS VIEW ======================== -->
          <div v-else-if="currentView === 'bulk'" key="bulk" class="view-panel fade-in">
            <div class="grid-layout premium-grid">
              <!-- Form Card -->
              <div class="card premium-card form-card shadow-sm border-0">
                <div class="card-header border-b border-slate-100 pb-4 mb-6">
                  <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">📋 Tengeneza Kampeni Mpya</h3>
                  <p class="text-slate-500 text-sm mt-1">Pakia faili la Excel (.xlsx au .csv) lenye namba za wateja wako.</p>
                </div>

                <div v-if="!userData?.whatsappPhoneId" class="alert-box warning-premium mb-6">
                  <span class="a-icon">⚠️</span>
                  <div>
                    <strong class="text-amber-800">Setup Haijakamilika</strong>
                    <p class="text-amber-700 text-sm">Hujaweka Namba yako ya WhatsApp API. Nenda kwenye "Mipangilio" kuiweka.</p>
                  </div>
                </div>

                <div class="form-group">
                  <label class="font-semibold text-slate-700">Jina la Kampeni <span class="text-rose-500">*</span></label>
                  <input type="text" v-model="campaignName" class="form-control premium-input mt-2" placeholder="Mfano: Ofa ya Sikukuu" :disabled="isSending" />
                </div>

                <div class="form-row mt-5">
                  <div class="form-group flex-1">
                    <label class="font-semibold text-slate-700">Jina la Template <span class="text-rose-500">*</span></label>
                    <input type="text" v-model="templateNameInput" class="form-control premium-input mt-2" placeholder="Mfano: weekend_ofa" :disabled="isSending" />
                  </div>
                  <div class="form-group" style="width: 140px;">
                    <label class="font-semibold text-slate-700">Lugha</label>
                    <select v-model="templateLanguage" class="form-control premium-input mt-2" :disabled="isSending">
                      <option value="sw">Kiswahili (sw)</option>
                      <option value="en_US">English (en)</option>
                    </select>
                  </div>
                </div>

                <div class="form-group mt-5">
                  <label class="font-semibold text-slate-700">Link ya Picha (Optional)</label>
                  <input type="text" v-model="headerImageUrl" class="form-control premium-input mt-2" placeholder="https://example.com/picha.jpg" :disabled="isSending" />
                </div>

                <div class="upload-zone premium-upload mt-6" @dragover.prevent @drop.prevent="handleDrop" @click="!selectedFile && !isSending ? $refs.fileInput.click() : null" :class="{ 'has-file border-emerald-500 bg-emerald-50': selectedFile, 'opacity-50 cursor-not-allowed': isSending }">
                  <input type="file" ref="fileInput" accept=".xlsx, .xls, .csv" style="display: none" @change="handleFileSelect" />
                  <div v-if="isExtracting" class="upload-state">
                    <span class="upload-icon spinning text-indigo-500 text-4xl">⏳</span>
                    <h4 class="mt-4 font-bold text-slate-700">Inasoma Excel yako...</h4>
                    <p class="text-slate-500 text-sm">Tafadhali subiri kidogo</p>
                  </div>
                  <div v-else-if="!selectedFile" class="upload-state">
                    <span class="upload-icon text-slate-400 text-5xl">📊</span>
                    <h4 class="mt-4 font-bold text-slate-700">Vuta na udondoshe Excel hapa</h4>
                    <p class="text-indigo-600 font-medium mt-1">au bofya hapa kuchagua faili</p>
                    <span class="upload-hint text-xs text-slate-400 mt-2">Inakubali: .xlsx, .xls, .csv</span>
                  </div>
                  <div v-else class="upload-state">
                    <span class="upload-icon text-emerald-500 text-5xl">✅</span>
                    <h4 class="text-emerald-700 font-bold mt-4">{{ selectedFile.name }}</h4>
                    <p class="text-slate-600 mt-1">Namba zilizopatikana: <strong class="text-slate-800">{{ parsedContacts.length }}</strong></p>
                    <button class="btn-outline-danger mt-4" @click.stop="clearFile" :disabled="isSending">🗑️ Ondoa Faili</button>
                  </div>
                </div>
              </div>

              <!-- Summary Card -->
              <div class="card premium-card summary-card shadow-sm border-0 bg-slate-50">
                <div class="card-header border-b border-slate-200 pb-4 mb-4">
                  <h3 class="text-lg font-bold text-slate-800">📊 Muhtasari wa Kampeni</h3>
                </div>

                <div class="summary-details mt-4 space-y-3">
                  <div class="flex justify-between items-center py-2">
                    <span class="text-slate-500 text-sm font-medium">Kampeni</span>
                    <strong class="text-slate-800">{{ campaignName || '—' }}</strong>
                  </div>
                  <div class="flex justify-between items-center py-2">
                    <span class="text-slate-500 text-sm font-medium">Template</span>
                    <strong class="text-slate-800">{{ templateNameInput || '—' }}</strong>
                  </div>
                  <div class="flex justify-between items-center py-2">
                    <span class="text-slate-500 text-sm font-medium">Lugha</span>
                    <strong class="text-slate-800">{{ templateLanguage === 'sw' ? 'Kiswahili' : 'English' }}</strong>
                  </div>
                  <div class="flex justify-between items-center py-2">
                    <span class="text-slate-500 text-sm font-medium">Picha</span>
                    <strong class="text-slate-800">{{ headerImageUrl ? '✅ Imepakiwa' : '❌ Hakuna' }}</strong>
                  </div>

                  <div class="h-px bg-slate-200 my-2"></div>

                  <div class="flex justify-between items-center py-3 bg-white px-4 rounded-lg border border-slate-100">
                    <span class="text-slate-600 font-semibold">Wateja wa Kutumiwa</span>
                    <strong class="text-xl text-indigo-600 font-black">{{ parsedContacts.length }}</strong>
                  </div>
                  <div class="flex justify-between items-center py-3 bg-white px-4 rounded-lg border border-slate-100">
                    <span class="text-slate-600 font-semibold">Gharama (TZS 84/SMS)</span>
                    <strong class="text-xl text-rose-600 font-black">TZS {{ formatMoney(parsedContacts.length * 84) }}</strong>
                  </div>

                  <div class="h-px bg-slate-200 my-2"></div>

                  <div class="flex justify-between items-center py-2">
                    <span class="text-slate-500 text-sm font-medium">Salio Lako</span>
                    <strong class="text-lg font-bold" :class="userData?.walletBalance >= (parsedContacts.length * 84) ? 'text-emerald-600' : 'text-rose-600'">
                      TZS {{ formatMoney(userData?.walletBalance) }}
                    </strong>
                  </div>
                </div>

                <!-- Conditional Buttons -->
                <div class="summary-actions mt-6">
                  <div v-if="userData?.walletBalance < (parsedContacts.length * 84) && parsedContacts.length > 0" class="alert-box error-premium mb-4">
                    <span class="a-icon">⚠️</span>
                    <div>
                      <strong class="text-rose-800">Salio Halitoshi</strong>
                      <p class="text-rose-700 text-sm">Unahitaji TZS {{ formatMoney((parsedContacts.length * 84) - userData?.walletBalance) }} zaidi.</p>
                    </div>
                  </div>

                  <button v-if="!userData?.whatsappPhoneId" class="btn-primary-premium full-width bg-amber-500 hover:bg-amber-600" disabled>
                    ⚠️ Kamilisha Setup ya Meta Kwanza
                  </button>
                  <button v-else-if="userData?.walletBalance < (parsedContacts.length * 84) && parsedContacts.length > 0" class="btn-primary-premium full-width bg-rose-500 hover:bg-rose-600" disabled>
                    ⚠️ Salio Lako Halitoshi
                  </button>
                  <button v-else class="btn-primary-premium full-width shadow-lg" :disabled="parsedContacts.length === 0 || isSending || !campaignName || !templateNameInput" @click="sendBulkSMS">
                    <span v-if="isSending" class="loader-small border-white border-t-transparent"></span>
                    <span v-else class="flex items-center justify-center gap-2">🚀 Tuma SMS Sasa <span class="bg-white/20 px-2 py-0.5 rounded text-sm ml-1">{{ parsedContacts.length }}</span></span>
                  </button>
                </div>

                <!-- Send Report -->
                <transition name="fade">
                  <div v-if="sendReport" class="report-box-premium mt-6" :class="sendReport.success ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'">
                    <div class="flex items-center gap-3 mb-4">
                      <span class="text-2xl">{{ sendReport.success ? '✅' : '❌' }}</span>
                      <h4 class="font-bold text-slate-800 text-lg">{{ sendReport.success ? 'Kampeni Imekamilika!' : 'Hitilafu Imetokea' }}</h4>
                    </div>
                    <p v-if="!sendReport.success" class="text-rose-700">{{ sendReport.message }}</p>
                    <div v-else class="grid grid-cols-3 gap-3">
                      <div class="bg-white p-3 rounded-xl border border-emerald-100 flex flex-col items-center justify-center text-center">
                        <span class="text-sm text-slate-500 font-medium">Zilizofika</span>
                        <strong class="text-xl text-emerald-600 font-black mt-1">{{ sendReport.successCount }}</strong>
                      </div>
                      <div class="bg-white p-3 rounded-xl border border-rose-100 flex flex-col items-center justify-center text-center">
                        <span class="text-sm text-slate-500 font-medium">Zilizofeli</span>
                        <strong class="text-xl text-rose-600 font-black mt-1">{{ sendReport.failedCount }}</strong>
                      </div>
                      <div class="bg-white p-3 rounded-xl border border-indigo-100 flex flex-col items-center justify-center text-center">
                        <span class="text-sm text-slate-500 font-medium">Salio Jipya</span>
                        <strong class="text-md text-indigo-600 font-bold mt-1">TZS {{ formatMoney(userData?.walletBalance) }}</strong>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>

          <!-- ======================== LIVE CHAT VIEW ======================== -->
          <div v-else-if="currentView === 'chat'" key="chat" class="view-panel chat-premium-layout fade-in">
            <!-- Chat Sidebar -->
            <div class="chat-sidebar-premium" :class="{'hide-on-mobile': activeChat !== null}">
              <div class="chat-sidebar-header bg-white border-b border-slate-100 p-5 flex justify-between items-center sticky top-0 z-10">
                <h3 class="text-lg font-black text-slate-800 flex items-center gap-2">💬 Inbox</h3>
                <button class="refresh-btn-premium text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors" @click="fetchContactsSilent" title="Onyesha upya">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.5l5.8 5.8"/></svg>
                </button>
              </div>

              <div class="chat-search-premium p-4 bg-white border-b border-slate-100">
                <div class="search-input-wrapper bg-slate-100 rounded-xl px-4 py-2.5 flex items-center gap-3 border border-transparent focus-within:border-indigo-300 focus-within:bg-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input type="text" placeholder="Tafuta mteja au namba..." v-model="searchQuery" class="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-700 placeholder-slate-400" />
                </div>
              </div>

              <div class="chat-filters-premium flex gap-2 p-3 bg-slate-50/80 border-b border-slate-100">
                <button :class="['filter-btn-premium', { 'active-filter': chatFilter === 'all' }]" @click="chatFilter = 'all'">
                  Zote
                </button>
                <button :class="['filter-btn-premium', { 'active-filter': chatFilter === 'unread' }]" @click="chatFilter = 'unread'">
                  Hazijasomwa <span v-if="totalUnread > 0" class="ml-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{{ totalUnread }}</span>
                </button>
              </div>

              <div class="chat-list-premium custom-scrollbar flex-1 overflow-y-auto bg-white">
                <div v-if="filteredContacts.length === 0" class="flex flex-col items-center justify-center p-10 text-center opacity-70">
                  <span class="text-5xl mb-4">📭</span>
                  <h4 class="font-bold text-slate-700">Hakuna Meseji</h4>
                  <p class="text-sm text-slate-500 mt-1">Hamna mawasiliano kwa sasa</p>
                </div>

                <div v-for="contact in filteredContacts" :key="contact.id"
                     class="contact-item-premium flex items-center p-4 cursor-pointer border-b border-slate-50 hover:bg-slate-50 transition-all duration-200"
                     :class="{ 'bg-indigo-50/60 border-l-4 border-l-indigo-600': activeChat === contact.id }"
                     @click="openChat(contact)">

                  <div class="contact-avatar-premium relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm"
                       :class="contact.unread > 0 ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-300'">
                    {{ contact.name.charAt(0).toUpperCase() }}
                    <span v-if="contact.unread > 0" class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>

                  <div class="contact-info-premium ml-4 flex-1 min-w-0">
                    <div class="flex justify-between items-baseline mb-1">
                      <h4 class="font-bold text-[15px] truncate" :class="contact.unread > 0 ? 'text-slate-900' : 'text-slate-700'">
                        {{ contact.name }}
                      </h4>
                      <span class="text-xs font-semibold whitespace-nowrap ml-2" :class="contact.unread > 0 ? 'text-indigo-600' : 'text-slate-400'">
                        {{ contact.time }}
                      </span>
                    </div>

                    <div class="flex justify-between items-center">
                      <p class="text-[13px] truncate flex-1" :class="contact.unread > 0 ? 'font-bold text-slate-800' : 'font-medium text-slate-500'">
                        <span v-if="contact.lastSender === 'me'" class="inline-block mr-1">
                          <svg v-if="contact.lastStatus === 'DELIVERED' || contact.lastStatus === 'READ'" viewBox="0 0 16 15" width="14" height="14" :class="contact.lastStatus === 'READ' ? 'text-blue-500' : 'text-slate-400'" fill="currentColor" class="inline">
                            <path d="M15.01 3.316l-4.203 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path>
                            <path d="M10.3 3.316l-4.204 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path>
                          </svg>
                          <svg v-else viewBox="0 0 16 15" width="14" height="14" class="text-slate-400 inline" fill="currentColor">
                            <path d="M10.91 3.316l-4.203 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path>
                          </svg>
                        </span>
                        {{ cleanMessagePreview(contact.lastMsg) }}
                      </p>
                      <span v-if="contact.unread > 0" class="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 shadow-sm">
                        {{ contact.unread }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Chat Main Area -->
            <div class="chat-main-premium flex-1 flex flex-col bg-[#efeae2] relative" :class="{'show-on-mobile': activeChat !== null}" v-if="activeChat">
              <!-- Chat Header -->
              <div class="chat-header-premium bg-white h-[72px] px-6 flex items-center justify-between border-b border-slate-200 z-20 shadow-sm">
                <div class="flex items-center gap-4">
                  <button class="back-btn-mobile text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors" @click="activeChat = null">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  </button>
                  <div class="w-11 h-11 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {{ currentActiveContact?.name?.charAt(0).toUpperCase() || '?' }}
                  </div>
                  <div>
                    <h4 class="font-bold text-slate-800 text-[16px] leading-tight">{{ currentActiveContact.name }}</h4>
                    <p class="text-sm font-medium text-slate-500 leading-tight">+{{ currentActiveContact.phone }}</p>
                  </div>
                </div>
              </div>

              <!-- Chat Background Pattern -->
              <div class="absolute inset-0 z-0 opacity-[0.06] pointer-events-none chat-bg-pattern-premium" style="background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-size: 400px; background-repeat: repeat;"></div>

              <!-- Messages Area -->
              <div class="chat-messages-premium custom-scrollbar flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 py-6 z-10 flex flex-col gap-2" ref="chatScroll">

                <div class="flex justify-center my-4">
                  <span class="bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 shadow-sm border border-slate-100">{{ currentDate }}</span>
                </div>

                <div class="flex justify-center mb-6">
                  <div class="bg-[#fef9c3] px-4 py-2 rounded-xl text-[12px] font-semibold text-amber-800 shadow-sm border border-amber-200/50 flex items-center gap-2 max-w-md text-center">
                    <span>🔒</span> Ujumbe umesimbwa kwa usalama. Gharama: <span class="font-black">TZS 30/SMS</span>
                  </div>
                </div>

                <!-- Meseji Zenyewe -->
                <div v-for="msg in chatMessages" :key="msg.id" class="w-full flex" :class="msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'">
                  <div class="message-bubble-premium relative max-w-[85%] md:max-w-[70%] rounded-[18px] shadow-sm flex flex-col"
                       :class="msg.direction === 'OUTBOUND' ? 'bg-[#dcfce7] rounded-tr-sm border border-emerald-100' : 'bg-white rounded-tl-sm border border-slate-100'">

                    <!-- 🔴 FIXED: MEDIA CONTAINER PREMIUM RENDERING -->
                    <div class="msg-media-premium" v-html="renderMessageContent(msg.text)"></div>

                    <!-- Timestamps & Ticks zilizokaa kisasa -->
                    <div class="msg-meta-premium flex items-center gap-1 self-end px-3 pb-2 pt-1" :class="msg.text.includes('[MEDIA:') ? 'absolute bottom-1 right-2 bg-white/70 backdrop-blur-md rounded-full px-2 py-0.5 z-10' : ''">
                      <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ msg.time }}</span>
                      <span v-if="msg.direction === 'OUTBOUND'" class="ml-1">
                        <!-- Pending / Sent (Tiki moja) -->
                        <svg v-if="msg.status === 'SENT' || msg.status === 'PENDING'" viewBox="0 0 16 15" width="13" height="13" class="text-slate-400" fill="currentColor">
                          <path d="M10.91 3.316l-4.203 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path>
                        </svg>
                        <!-- Delivered / Read (Tiki mbili) -->
                        <svg v-if="msg.status === 'DELIVERED' || msg.status === 'READ'" viewBox="0 0 16 15" width="14" height="14" :class="msg.status === 'READ' ? 'text-blue-500' : 'text-slate-400'" fill="currentColor">
                          <path d="M15.01 3.316l-4.203 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path>
                          <path d="M10.3 3.316l-4.204 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path>
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Input Area -->
              <div class="chat-input-premium bg-[#f0f2f5] p-3 md:p-4 flex items-end gap-3 z-20">
                <div class="flex-1 bg-white rounded-2xl flex items-center px-4 shadow-sm border border-slate-200 focus-within:border-indigo-400 transition-colors">
                  <textarea
                    v-model="newChatMessage"
                    placeholder="Andika ujumbe hapa..."
                    class="w-full bg-transparent border-none outline-none py-3.5 max-h-32 resize-none text-[15px] font-medium text-slate-800 placeholder-slate-400"
                    rows="1"
                    @keyup.enter.prevent="sendLiveMessage"
                    :disabled="isSendingChat || userData?.walletBalance < 30 || !userData?.whatsappPhoneId"
                  ></textarea>
                </div>
                <button
                  class="send-btn-premium flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white transition-all shadow-md"
                  :class="(!newChatMessage.trim() || isSendingChat || userData?.walletBalance < 30 || !userData?.whatsappPhoneId) ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 hover:scale-105 hover:shadow-lg'"
                  @click="sendLiveMessage"
                  :disabled="!newChatMessage.trim() || isSendingChat || userData?.walletBalance < 30 || !userData?.whatsappPhoneId"
                >
                  <span v-if="isSendingChat" class="loader-small border-white border-t-transparent w-5 h-5"></span>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" class="ml-1"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                </button>
              </div>
            </div>

            <!-- Empty State Chat -->
            <div class="chat-main-premium empty flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] z-10" v-else>
              <div class="text-center max-w-sm px-6">
                <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mx-auto shadow-sm text-slate-300 mb-6">💬</div>
                <h2 class="text-2xl font-black text-slate-700 mb-2">Live Chat Ipo Tayari</h2>
                <p class="text-slate-500 font-medium mb-8">Bofya jina la mteja upande wa kushoto kuanza au kuendeleza mazungumzo.</p>
                <div class="flex justify-center gap-4 flex-wrap">
                  <span class="bg-white px-4 py-2 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100 flex items-center gap-1.5">🔒 Ulinzi Kamili</span>
                  <span class="bg-white px-4 py-2 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100 flex items-center gap-1.5">⚡ Fast Delivery</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ======================== SETTINGS VIEW ======================== -->
          <div v-else-if="currentView === 'settings'" key="settings" class="view-panel fade-in">
            <div class="settings-container max-w-3xl mx-auto">
              <div class="card premium-card p-8 border-0 shadow-sm bg-white">
                <div class="settings-header text-center mb-10">
                  <div class="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 text-indigo-500">🛡️</div>
                  <h2 class="text-2xl font-black text-slate-800">Mipangilio ya Akaunti</h2>
                  <p class="text-slate-500 font-medium mt-1">Taarifa zako za WhatsApp API zimehifadhiwa kwa usalama</p>
                </div>

                <div v-if="userData?.whatsappPhoneId && userData?.wabaId" class="api-details space-y-4">
                  <div class="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 font-bold py-3 px-6 rounded-xl border border-emerald-200 mb-6">
                    <span class="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Imeshikamana na Meta API Kikamilifu
                  </div>

                  <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div class="text-3xl">🏢</div>
                    <div>
                      <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jina la Biashara</h4>
                      <p class="text-lg font-black text-slate-800">{{ userData.businessName }}</p>
                    </div>
                  </div>

                  <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div class="text-3xl">🔑</div>
                    <div>
                      <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">WhatsApp Business Account ID (WABA)</h4>
                      <p class="text-[15px] font-mono font-bold text-slate-700 bg-white px-3 py-1 rounded border border-slate-200 mt-1 inline-block">{{ userData.wabaId }}</p>
                    </div>
                  </div>

                  <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div class="text-3xl">📱</div>
                    <div>
                      <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number ID</h4>
                      <p class="text-[15px] font-mono font-bold text-slate-700 bg-white px-3 py-1 rounded border border-slate-200 mt-1 inline-block">{{ userData.whatsappPhoneId }}</p>
                    </div>
                  </div>

                  <div class="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 mt-6">
                    <span class="text-xl">ℹ️</span>
                    <div>
                      <strong class="text-indigo-800 block text-sm mb-1">Taarifa Muhimu</strong>
                      <p class="text-indigo-700/80 text-sm font-medium">Namba hizi zimesomwa kiotomatiki kutoka Meta. Hazibadiliki isipokuwa Admin afanye mabadiliko rasmi kwenye mfumo.</p>
                    </div>
                  </div>
                </div>

                <div v-else class="api-details">
                  <div class="flex items-center justify-center gap-2 bg-amber-50 text-amber-700 font-bold py-3 px-6 rounded-xl border border-amber-200 mb-6">
                    <span class="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                    Setup ya Meta Haijakamilika
                  </div>

                  <div class="space-y-4">
                    <div class="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span class="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-sm">1</span>
                      <div>
                        <h4 class="font-bold text-slate-800">Toka kwenye mfumo</h4>
                        <p class="text-sm text-slate-500 font-medium mt-1">Bofya kitufe cha "Toka" na urudi kwenye ukurasa wa kuingia</p>
                      </div>
                    </div>
                    <div class="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span class="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-sm">2</span>
                      <div>
                        <h4 class="font-bold text-slate-800">Ingia kupitia Facebook</h4>
                        <p class="text-sm text-slate-500 font-medium mt-1">Tumia kitufe cha bluu cha "Endelea na Facebook" kuingia tena kwenye mfumo</p>
                      </div>
                    </div>
                    <div class="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span class="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-sm">3</span>
                      <div>
                        <h4 class="font-bold text-slate-800">Kamilisha Ruhusa Zote (Permissions)</h4>
                        <p class="text-sm text-slate-500 font-medium mt-1">Hakikisha unaruhusu WhatsApp Business Management na kuthibitisha namba yako</p>
                      </div>
                    </div>
                  </div>

                  <button class="w-full mt-8 bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2" @click="$emit('logout')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.5l5.8 5.8"/></svg>
                    Toka na Ujaribu Upya Sasa
                  </button>
                </div>
              </div>
            </div>
          </div>

        </transition>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onUnmounted, watch } from 'vue';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { io } from "socket.io-client";

const props = defineProps({ user: { type: Object, required: true } });
const emit = defineEmits(['logout']);

const userData = ref({ ...props.user });
watch(() => props.user, (newVal) => { userData.value = { ...newVal }; }, { deep: true });

const currentView = ref('home');
const pageTitle = computed(() => {
  const titles = {
    'home': 'Muhtasari wa Biashara',
    'bulk': 'Kituo cha Bulk SMS',
    'chat': 'Live Chat (Wateja)',
    'settings': 'Mipangilio ya Akaunti'
  };
  return titles[currentView.value] || 'Dashboard';
});

const currentDate = computed(() => {
  return new Date().toLocaleDateString('sw-TZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

const formatMoney = (amount) => {
  return Number(amount || 0).toLocaleString();
};

// ==========================================
// 🎨 MEDIA PARSING LOGIC (PREMIUM FIX)
// ==========================================
const renderMessageContent = (text) => {
  if (!text) return '';

  // 🔴 FIXED: CSS Classes zimeboreshwa ili picha zi-fit vizuri kwenye bubble (edge-to-edge style)
  if (text.startsWith('[MEDIA:IMAGE]')) {
    const url = text.replace('[MEDIA:IMAGE]', '');
    return `<div class="media-premium-container"><img src="${url}" class="chat-image-premium" alt="Picha" loading="lazy" /></div>`;
  }
  else if (text.startsWith('[MEDIA:VIDEO]')) {
    const url = text.replace('[MEDIA:VIDEO]', '');
    return `<div class="media-premium-container"><video src="${url}" controls class="chat-video-premium" preload="metadata"></video></div>`;
  }
  else if (text.startsWith('[MEDIA:AUDIO]')) {
    const url = text.replace('[MEDIA:AUDIO]', '');
    return `<div class="audio-premium-container"><audio src="${url}" controls class="chat-audio-premium"></audio></div>`;
  }
  else if (text.startsWith('[MEDIA:DOCUMENT]')) {
    const url = text.replace('[MEDIA:DOCUMENT]', '');
    return `<a href="${url}" target="_blank" class="document-link-premium">
              <span class="doc-icon bg-indigo-100 text-indigo-600 p-2 rounded-lg">📄</span>
              <span class="font-bold underline decoration-indigo-200 underline-offset-4">Pakua Faili</span>
            </a>`;
  }

  // Text formatting
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const boldRegex = /\*(.*?)\*/g; // WhatsApp bold syntax *bold*

  let formattedText = text
    .replace(urlRegex, '<a href="$1" target="_blank" class="text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-2 transition-colors">$1</a>')
    .replace(boldRegex, '<strong class="font-black">$1</strong>');

  return `<div class="msg-text-premium px-3 pt-2 pb-1">${formattedText}</div>`;
};

// 🔴 FIXED: Preview nzuri zaidi kwenye Sidebar kuondoa "clip" icon inayochanganya text
const cleanMessagePreview = (text) => {
  if (!text) return '...';
  if (text.startsWith('[MEDIA:IMAGE]')) return '📷 Picha';
  if (text.startsWith('[MEDIA:VIDEO]')) return '🎥 Video';
  if (text.startsWith('[MEDIA:AUDIO]')) return '🎵 Sauti (Voice Note)';
  if (text.startsWith('[MEDIA:DOCUMENT]')) return '📄 Faili (Document)';

  // Safisha kama kulikuwa na tag za media zilizoshindwa kudownload
  if (text.includes('📎 [Faili:')) {
     return text.replace('📎 [Faili:', '📎 Media ').replace(']', '').split('-')[0].trim();
  }
  return text;
};

// ==========================================
// 🚀 SOCKET.IO LOGIC
// ==========================================
let socket = null;
const isSocketConnected = ref(false);
let notificationSound = null;

const initSocket = () => {
    const token = localStorage.getItem('msamba_token');
    if(!token) return;

    try {
        notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    } catch(e) {
        console.log('Audio not supported');
    }

    socket = io("https://apibulksms.kedeshlimited.com", {
        auth: { token: token },
        transports: ['polling', 'websocket']
    });

    socket.on("connect", () => {
        isSocketConnected.value = true;
    });

    socket.on("disconnect", () => {
        isSocketConnected.value = false;
    });

    socket.on("newIncomingMessage", (data) => {
        const isMe = data.contactName === "You" || data.message.direction === 'OUTBOUND';

        if (!isMe && notificationSound) {
            notificationSound.play().catch(() => {});
        }

        if (activeChat.value === data.contactId) {
            const exists = chatMessages.value.find(m =>
                m.id === data.message.id ||
                (m.text === data.message.content && m.status === 'PENDING')
            );

            if (!exists) {
                chatMessages.value.push({
                    id: data.message.id,
                    metaMsgId: data.message.metaMsgId,
                    direction: data.message.direction,
                    text: data.message.content,
                    status: data.message.status,
                    time: formatTime(data.message.createdAt)
                });
                scrollToBottom();
            } else if (exists && exists.status === 'PENDING') {
                exists.id = data.message.id;
                exists.status = data.message.status;
            }

            if (!isMe) {
                const token = localStorage.getItem('msamba_token');
                axios.get(`https://apibulksms.kedeshlimited.com/api/chat/messages/${data.contactId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => {});
            }
        }
        fetchContactsSilent();
    });

    socket.on("messageStatusUpdate", (data) => {
        const msg = chatMessages.value.find(m => m.metaMsgId === data.metaMsgId);
        if (msg) {
            msg.status = data.status;
        }
        const contact = chatContacts.value.find(c => c.id === activeChat.value);
        if(contact && contact.lastStatus !== 'READ') {
            contact.lastStatus = data.status;
        }
    });

    socket.on("walletUpdate", (data) => {
        if (data.newBalance !== undefined) {
            userData.value.walletBalance = data.newBalance;
        }
    });

    socket.on("campaignComplete", (data) => {
        if (data.newBalance !== undefined) {
            userData.value.walletBalance = data.newBalance;
        }

        isSending.value = false;
        sendReport.value = {
             success: true,
             message: "Kazi Imemalizika kikamilifu. Hii ndio ripoti yako halisi:",
             successCount: data.stats?.success || 0,
             failedCount: data.stats?.failed || 0
        };

        fetchDashboardStats(false);
    });
};

const fetchContactsSilent = async () => {
  try {
    const token = localStorage.getItem('msamba_token');
    if (!token) return;
    const res = await axios.get('https://apibulksms.kedeshlimited.com/api/chat/contacts', {
        headers: { Authorization: `Bearer ${token}` }
    });
    if(res.data.success) {
        chatContacts.value = res.data.contacts.map(c => ({
            ...c,
            time: formatTime(c.time)
        }));
    }
  } catch(e) {
    console.error('Error fetching contacts:', e);
  }
};

// ==========================================
// 📊 DASHBOARD & STATS LOGIC
// ==========================================
const totalSent = ref(0);
const totalDelivered = ref(0);
const totalContacts = ref(0);
const totalFailed = ref(0);
const isLoadingStats = ref(true);

const fetchDashboardStats = async (showLoader = true) => {
  if (showLoader) isLoadingStats.value = true;
  try {
      const token = localStorage.getItem('msamba_token');
      if(!token) return;
      const res = await axios.get('https://apibulksms.kedeshlimited.com/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
      });
      if(res.data.success) {
          totalSent.value = res.data.stats.totalSent || 0;
          totalDelivered.value = res.data.stats.totalDelivered || 0;
          totalContacts.value = res.data.stats.totalContacts || 0;
          totalFailed.value = res.data.stats.totalFailed || 0;
      }
  } catch(e) {
    console.error('Error fetching stats:', e);
  } finally {
      isLoadingStats.value = false;
  }
};

const showTopupModal = ref(false);

// ======================= BULK SMS =======================
const fileInput = ref(null);
const selectedFile = ref(null);
const parsedContacts = ref([]);
const campaignName = ref('');
const templateNameInput = ref('hello_world');
const templateLanguage = ref('sw');
const headerImageUrl = ref('');
const isExtracting = ref(false);
const isSending = ref(false);
const sendReport = ref(null);

const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) processExcel(file);
};

const handleDrop = (event) => {
    const file = event.dataTransfer.files[0];
    if (file) processExcel(file);
};

const clearFile = () => {
    selectedFile.value = null;
    parsedContacts.value = [];
    sendReport.value = null;
    if (fileInput.value) fileInput.value.value = '';
};

const processExcel = (file) => {
  selectedFile.value = file;
  isExtracting.value = true;
  sendReport.value = null;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      let numbersArray = [];
      jsonData.forEach((row) => {
         for (let cell of Object.values(row)) {
           if (cell) {
              let phone = String(cell).replace(/\D/g, '');
              if (phone.length >= 9) {
                  if (phone.startsWith('0')) phone = '255' + phone.substring(1);
                  else if (phone.length === 9) phone = '255' + phone;
                  if (phone.length >= 10 && phone.length <= 15 && phone.startsWith('255')) {
                      numbersArray.push(phone);
                      break;
                  }
              }
           }
         }
      });

      parsedContacts.value = [...new Set(numbersArray)];
      if(parsedContacts.value.length === 0) {
          alert("Hakuna namba sahihi zilizopatikana kwenye faili.");
          clearFile();
      }
    } catch (error) {
        console.error('Excel parsing error:', error);
        alert("Faili halisomeki vizuri. Hakikisha ni .xlsx au .csv halali.");
        clearFile();
    } finally {
        isExtracting.value = false;
    }
  };
  reader.readAsArrayBuffer(file);
};

const sendBulkSMS = async () => {
   if (parsedContacts.value.length === 0 || !campaignName.value || !templateNameInput.value) return;

   const estimatedCost = parsedContacts.value.length * 84;
   if(userData.value.walletBalance < estimatedCost) {
      alert(`Salio lako halitoshi. Unahitaji TZS ${formatMoney(estimatedCost)}. Salio lako sasa: TZS ${formatMoney(userData.value.walletBalance)}`);
      return;
   }

   isSending.value = true;
   sendReport.value = null;

   try {
      const token = localStorage.getItem('msamba_token');
      const res = await axios.post('https://apibulksms.kedeshlimited.com/api/send-bulk', {
          contacts: parsedContacts.value,
          campaignName: campaignName.value,
          templateName: templateNameInput.value.trim(),
          templateLanguage: templateLanguage.value.trim(),
          headerImageUrl: headerImageUrl.value.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (!res.data.success) {
         isSending.value = false;
         alert("Imeshindwa kuanzisha kampeni. Jaribu tena.");
      }
   } catch (error) {
      isSending.value = false;
      sendReport.value = {
          success: false,
          message: error.response?.data?.error || "Kosa la kimtandao limetokea."
      };
   }
};

// ======================= LIVE CHAT =======================
const activeChat = ref(null);
const chatScroll = ref(null);
const newChatMessage = ref('');
const chatContacts = ref([]);
const chatMessages = ref([]);
const isSendingChat = ref(false);
const searchQuery = ref('');
const chatFilter = ref('all');
let statsPolling = null;

const currentActiveContact = computed(() => {
    return chatContacts.value.find(c => c.id === activeChat.value) || {};
});

const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' });
};

const totalUnread = computed(() => {
    return chatContacts.value.reduce((sum, contact) => sum + (contact.unread || 0), 0);
});

const filteredContacts = computed(() => {
  let result = chatContacts.value;
  if (chatFilter.value === 'unread') {
    result = result.filter(c => c.unread > 0);
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query)
    );
  }
  return result;
});

const fetchContacts = async () => {
  try {
    const token = localStorage.getItem('msamba_token');
    if(!token) return;
    const res = await axios.get('https://apibulksms.kedeshlimited.com/api/chat/contacts', {
        headers: { Authorization: `Bearer ${token}` }
    });
    if(res.data.success) {
        chatContacts.value = res.data.contacts.map(c => ({
            ...c,
            time: formatTime(c.time)
        }));
    }
  } catch(e) {
    console.error('Error fetching contacts:', e);
  }
};

const fetchMessages = async (contactId) => {
  try {
    const token = localStorage.getItem('msamba_token');
    const res = await axios.get(`https://apibulksms.kedeshlimited.com/api/chat/messages/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if(res.data.success) {
      chatMessages.value = res.data.messages.map(m => ({
          id: m.id,
          metaMsgId: m.metaMsgId,
          direction: m.direction,
          text: m.content,
          status: m.status,
          time: formatTime(m.createdAt)
      }));
    }
  } catch(e) {
    console.error('Error fetching messages:', e);
  }
};

const openChat = (contact) => {
  activeChat.value = contact.id;
  contact.unread = 0;
  fetchMessages(contact.id);
  setTimeout(scrollToBottom, 300);
};

const sendLiveMessage = async () => {
  if(userData.value.walletBalance < 30) {
      alert("⚠️ Salio lako halitoshi. Unahitaji angalau TZS 30 kujibu ujumbe.");
      return;
  }
  if (!newChatMessage.value.trim() || isSendingChat.value || !activeChat.value) return;
  if (!userData.value.whatsappPhoneId) {
      alert("⚠️ Akaunti yako haijaunganishwa na WhatsApp API. Nenda kwenye Mipangilio.");
      return;
  }

  const textToSend = newChatMessage.value;
  newChatMessage.value = '';
  isSendingChat.value = true;

  const tempId = Date.now();
  chatMessages.value.push({
      id: tempId,
      metaMsgId: null,
      direction: 'OUTBOUND',
      text: textToSend,
      status: 'PENDING',
      time: new Date().toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })
  });
  scrollToBottom();

  try {
    const token = localStorage.getItem('msamba_token');
    const res = await axios.post('https://apibulksms.kedeshlimited.com/api/chat/send', {
      contactId: activeChat.value,
      phone: currentActiveContact.value.phone,
      messageText: textToSend
    }, { headers: { Authorization: `Bearer ${token}` } });

    if(res.data.success && res.data.newBalance !== undefined) {
        userData.value.walletBalance = res.data.newBalance;
        fetchDashboardStats(false);
    }
    fetchMessages(activeChat.value);
    fetchContactsSilent();
  } catch (error) {
    chatMessages.value = chatMessages.value.filter(m => m.id !== tempId);

    if(error.response?.status === 402) {
        alert("Salio lako limeisha. Tafadhali ongeza salio kuendelea kutuma ujumbe.");
    } else if(error.response?.status === 403) {
        alert("Huna Phone ID iliyounganishwa. Nenda kwenye Mipangilio kukamilisha setup.");
    } else if(error.response?.status === 400) {
        alert(error.response.data.error);
    } else {
        alert("Imeshindwa kutuma ujumbe. Tafadhali jaribu tena.");
    }
  } finally {
      isSendingChat.value = false;
  }
};

const scrollToBottom = async () => {
    await nextTick();
    if (chatScroll.value) {
        chatScroll.value.scrollTop = chatScroll.value.scrollHeight;
    }
};

const startStatsPolling = () => {
  fetchDashboardStats();
  statsPolling = setInterval(() => {
    if(currentView.value === 'home') fetchDashboardStats(false);
  }, 15000);
};

const stopStatsPolling = () => {
    if (statsPolling) {
        clearInterval(statsPolling);
        statsPolling = null;
    }
};

watch(currentView, (newView) => {
    if(newView === 'chat') {
        fetchContacts();
    }
});

onMounted(() => {
    initSocket();
    startStatsPolling();
    if (currentView.value === 'chat') fetchContacts();
});

onUnmounted(() => {
    stopStatsPolling();
    if(socket) socket.disconnect();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.dashboard-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #f8fafc;
  overflow: hidden;
}

/* ==========================================
   🎨 1. CORE UTILITIES & ANIMATIONS
   ========================================== */
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.fade-in { animation: fadeIn 0.4s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.hover-lift:hover { transform: translateY(-4px); box-shadow: 0 15px 30px rgba(0,0,0,0.06); }

/* ==========================================
   🚀 2. PREMIUM SIDEBAR (DARK THEME)
   ========================================== */
.premium-sidebar {
  width: 280px;
  background: #0f172a;
  color: white;
  border-right: 1px solid #1e293b;
  position: relative;
  z-index: 50;
  box-shadow: 4px 0 24px rgba(0,0,0,0.05);
}

.brand {
  padding: 12px 0 24px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.premium-badge {
  background: linear-gradient(135deg, #4f46e5, #3b82f6);
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.65rem;
  letter-spacing: 0.5px;
}

.nav-btn {
  color: #94a3b8;
  border-radius: 12px;
  margin-bottom: 6px;
  padding: 14px 16px;
  font-weight: 600;
  border: 1px solid transparent;
}

.nav-btn:hover {
  background: rgba(255,255,255,0.03);
  color: #f8fafc;
}

.active-nav {
  background: linear-gradient(135deg, #4f46e5, #3730a3) !important;
  color: white !important;
  box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
  border: 1px solid rgba(255,255,255,0.1);
}

.premium-wallet {
  background: linear-gradient(135deg, #10b981, #059669);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.2);
}

.topup-btn-premium {
  background: rgba(255,255,255,0.15);
  color: white;
  border: none;
  padding: 12px;
  width: 100%;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(5px);
}
.topup-btn-premium:hover { background: white; color: #059669; }

.user-profile-mini {
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.05);
}

.user-avatar-gradient {
  width: 42px; height: 42px;
  background: linear-gradient(135deg, #4f46e5, #8b5cf6);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1.2rem;
  box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
}

/* ==========================================
   💎 3. PREMIUM TOPBAR & MAIN CONTENT
   ========================================== */
.premium-topbar {
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
  z-index: 40;
}

.premium-card {
  background: white;
  border-radius: 24px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
}

.premium-action-card {
  padding: 24px;
  border-radius: 20px;
  background: white;
  border: 1px solid #e2e8f0;
  text-align: center;
}

.action-icon-top {
  width: 56px; height: 56px;
  background: #f8fafc;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem;
  margin: 0 auto;
}

/* ==========================================
   🔥 4. LIVE CHAT FIXES (THE REAL DEAL)
   ========================================== */
.chat-premium-layout {
  display: flex;
  background: white;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  height: calc(100vh - 130px);
  box-shadow: 0 10px 40px rgba(0,0,0,0.04);
}

.chat-sidebar-premium {
  width: 380px; /* Wider for better readability */
  border-right: 1px solid #e2e8f0;
  display: flex; flex-direction: column;
  background: white; z-index: 10;
}

.chat-main-premium {
  background-color: #f1f5f9;
}

/* Meseji Rendering Fixes (Media Edge-to-Edge) */
.message-bubble-premium {
  overflow: hidden; /* Muhimu sana ili picha zifuate shape ya bubble */
}

.msg-media-premium {
  width: 100%;
}

.media-premium-container {
  width: 100%;
  max-width: 350px; /* Size nzuri kwa picha */
  background: transparent;
  display: block; /* Inaondoa flex space ya ajabu */
}

/* Picha inakaa fit na kona za bubble (kama WhatsApp) */
.chat-image-premium {
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: cover;
  display: block;
}

.chat-video-premium {
  width: 100%;
  max-height: 400px;
  display: block;
}

.audio-premium-container {
  padding: 12px;
  min-width: 250px;
}

.document-link-premium {
  display: flex; align-items: center; gap: 12px;
  padding: 16px;
  color: #1e293b;
}

/* Maandishi Ya Meseji (High Contrast) */
.msg-text-premium {
  font-size: 0.95rem;
  color: #0f172a;
  font-weight: 500;
  line-height: 1.5;
}

/* Input Area Premium */
.chat-input-premium {
  border-top: 1px solid #e2e8f0;
  background: white;
}

.send-btn-premium {
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);
}

/* ==========================================
   📱 5. MOBILE RESPONSIVENESS (PERFECT FIT)
   ========================================== */
@media (max-width: 992px) {
  .dashboard-layout { flex-direction: column; }
  .premium-sidebar { width: 100%; }

  .chat-premium-layout {
    height: 82vh; /* Inaruhusu kioo kujaa vizuri kwenye simu */
    border-radius: 16px;
    margin-bottom: 20px;
  }

  .chat-sidebar-premium { width: 100%; }
  .hidden-mobile { display: none !important; }

  .message-bubble-premium {
    max-width: 90%; /* Bubble inachukua nafasi kubwa simuni */
  }

  /* Kuhakikisha keyboard haifichi input kwenye simu */
  .chat-input-premium {
    padding-bottom: env(safe-area-inset-bottom, 16px);
  }
}

/* Utility Classes kwa Forms za Bulk SMS */
.premium-input {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  padding: 14px 16px;
  font-weight: 600;
}
.premium-input:focus {
  background: white;
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.premium-upload {
  border: 2px dashed #cbd5e1;
  background: white;
  border-radius: 20px;
  transition: all 0.3s;
}
.premium-upload:hover { border-color: #6366f1; background: #f8fafc; }

.btn-primary-premium {
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  color: white;
  padding: 14px;
  border-radius: 14px;
  font-weight: 700;
  transition: all 0.2s;
}
.btn-primary-premium:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3);
}

/* Background Pattern ya Kisasa kwa Live Chat */
.chat-bg-pattern-premium {
  background-image: radial-gradient(#cbd5e1 1.5px, transparent 1.5px);
  background-size: 24px 24px;
}
</style>
