<template>
  <div class="dashboard-layout">
    
    <!-- MODAL YA KUONGEZA SALIO (IMEBOreshWA) -->
    <transition name="fade">
      <div v-if="showTopupModal" class="modal-overlay" @click.self="showTopupModal = false">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-header-content">
              <span class="modal-icon">💳</span>
              <h3>Weka Salio kwenye Akaunti</h3>
            </div>
            <button class="close-btn" @click="showTopupModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="wallet-icon-large">💰</div>
            <h2 class="modal-title">Lipa na Ongeza Salio</h2>
            <p class="modal-description">
              Fanya malipo kupitia namba ya ofisi hapa chini. Baada ya muamala kukamilika, wasiliana na Admin ili kupandishiwa salio lako papo hapo.
            </p>
            
            <div class="payment-methods">
              <div class="payment-method active">
                <span class="method-icon">📱</span>
                <div>
                  <strong>M-Pesa / TigoPesa / Airtel Money</strong>
                  <p>Lipa kwa namba ya kampuni</p>
                </div>
              </div>
            </div>

            <div class="contact-admin">
              <div class="contact-row">
                <span class="contact-label">Namba ya Malipo:</span>
                <strong class="contact-value">0667 961 231</strong>
              </div>
              <div class="contact-row">
                <span class="contact-label">Jina la Kampuni:</span>
                <strong class="contact-value">KEDESH LIMITED</strong>
              </div>
            </div>

            <div class="alert-box info mt-4">
              <span class="a-icon">💡</span>
              <div>
                <strong>Muhimu:</strong>
                <p>Baada ya kutuma malipo, tafadhali wasiliana na Admin kupitia WhatsApp au simu ili kusasisha salio lako mara moja.</p>
              </div>
            </div>
            
            <button class="btn-primary full-width mt-4" @click="showTopupModal = false">
              ✅ Sawa, Nimeelewa
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- MENU YA PEMBENI (SIDEBAR) - IMEBOreshWA -->
    <aside class="sidebar">
      <div class="sidebar-inner">
        <div class="brand">
          <div class="brand-logo-wrapper">
            <img src="/logo/image.png" alt="Kedesh Limited" class="brand-logo" />
          </div>
          <div class="brand-text">
            <h2>{{ userData?.businessName || 'KEDESH LIMITED' }}</h2>
            <span class="brand-badge">WhatsApp API</span>
          </div>
        </div>

        <div class="nav-menu custom-scrollbar">
          <p class="menu-label">MENU KUU</p>
          <button :class="['nav-btn', { active: currentView === 'home' }]" @click="currentView = 'home'">
            <span class="nav-icon">📊</span> 
            <span class="nav-text">Muhtasari</span>
            <span class="nav-arrow" v-if="currentView === 'home'">›</span>
          </button>
          <button :class="['nav-btn', { active: currentView === 'bulk' }]" @click="currentView = 'bulk'">
            <span class="nav-icon">🚀</span> 
            <span class="nav-text">Bulk SMS</span>
            <span class="nav-arrow" v-if="currentView === 'bulk'">›</span>
          </button>
          <button :class="['nav-btn', { active: currentView === 'chat' }]" @click="currentView = 'chat'">
            <span class="nav-icon">💬</span> 
            <span class="nav-text">Live Chat</span>
            <span v-if="totalUnread > 0" class="unread-badge-sidebar">{{ totalUnread }}</span>
            <span class="nav-arrow" v-if="currentView === 'chat'">›</span>
          </button>
          
          <p class="menu-label mt-4">MIPANGILIO</p>
          <button :class="['nav-btn', { active: currentView === 'settings' }]" @click="currentView = 'settings'">
            <span class="nav-icon">⚙️</span> 
            <span class="nav-text">API & Akaunti</span>
            <span class="nav-arrow" v-if="currentView === 'settings'">›</span>
          </button>
        </div>

        <div class="sidebar-footer">
          <div class="wallet-card-mini">
            <div class="wallet-top">
              <span class="wallet-label">💰 Salio Lako</span>
              <span class="wallet-currency">TZS</span>
            </div>
            <h3 class="wallet-amount">{{ formatMoney(userData?.walletBalance) }}</h3>
            <button class="topup-btn" @click="showTopupModal = true">
              <span>➕</span> Weka Salio
            </button>
          </div>
          
          <div class="user-profile-mini">
            <div class="user-avatar">{{ userData?.businessName?.charAt(0).toUpperCase() || 'K' }}</div>
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
      <!-- HEADER YA JUU - IMEBOreshWA -->
      <header class="topbar">
        <div class="topbar-left">
          <div class="page-title">
            <h1>{{ pageTitle }}</h1>
            <p class="date-text">{{ currentDate }}</p>
          </div>
        </div>
        <div class="topbar-right">
          <!-- Socket Connection Status -->
          <div class="status-indicator" :class="isSocketConnected ? 'connected' : 'disconnected'" title="Hali ya Muunganisho">
            <span class="status-dot"></span>
            <span class="status-text">{{ isSocketConnected ? 'Live' : 'Offline' }}</span>
          </div>
          
          <!-- API Status -->
          <div class="status-indicator" :class="(userData?.whatsappPhoneId && userData?.wabaId) ? 'connected' : 'warning'" title="Hali ya API ya WhatsApp">
            <span class="status-dot"></span>
            <span class="status-text">{{ (userData?.whatsappPhoneId && userData?.wabaId) ? 'API Active' : 'Setup Required' }}</span>
          </div>

          <button @click="$emit('logout')" class="logout-btn-top">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Toka
          </button>
        </div>
      </header>

      <div class="content-area custom-scrollbar">
        <transition name="fade-slide" mode="out-in">
          
          <!-- ======================== HOME VIEW ======================== -->
          <div v-if="currentView === 'home'" key="home" class="view-panel">
            
            <!-- ONYO LA SETUP -->
            <div v-if="!userData?.wabaId || !userData?.whatsappPhoneId" class="setup-banner">
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
            <div class="welcome-banner">
              <div class="banner-content">
                <div class="banner-text-section">
                  <div class="greeting-badge">
                    <span class="wave-emoji">👋</span> Karibu
                  </div>
                  <h2>{{ userData?.fullName?.split(' ')[0] || userData?.businessName || 'Kiongozi' }}!</h2>
                  <p>Huu ni mfumo wako wa kisasa wa kudhibiti mawasiliano ya WhatsApp. Tuma Bulk SMS na jibu wateja wako kwa urahisi na usalama wa hali ya juu.</p>
                  <div class="banner-stats">
                    <div class="banner-stat-item">
                      <span class="banner-stat-number">84</span>
                      <span class="banner-stat-label">TZS/SMS</span>
                    </div>
                    <div class="banner-stat-divider"></div>
                    <div class="banner-stat-item">
                      <span class="banner-stat-number">30</span>
                      <span class="banner-stat-label">TZS/Chat</span>
                    </div>
                    <div class="banner-stat-divider"></div>
                    <div class="banner-stat-item">
                      <span class="banner-stat-number">24/7</span>
                      <span class="banner-stat-label">Support</span>
                    </div>
                  </div>
                </div>
                <div class="banner-illustration">
                  <div class="illustration-circle">
                    <span class="illustration-icon">📈</span>
                  </div>
                  <div class="illustration-floating floating-1">💬</div>
                  <div class="illustration-floating floating-2">🚀</div>
                  <div class="illustration-floating floating-3">✅</div>
                </div>
              </div>
              <button class="btn-banner" @click="currentView = 'bulk'" :disabled="!userData?.wabaId">
                🚀 Anza Kampeni Mpya
              </button>
            </div>

            <!-- STATS GRID -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-card-inner">
                  <div class="stat-icon-wrapper bg-blue-light">
                    <span class="stat-icon-emoji">📨</span>
                  </div>
                  <div class="stat-info">
                    <h3 v-if="isLoadingStats" class="stat-loading">...</h3>
                    <h3 v-else class="stat-number">{{ formatMoney(totalSent) }}</h3>
                    <p class="stat-label-text">Jumla ya SMS</p>
                  </div>
                </div>
                <div class="stat-trend up">↑ 12% mwezi huu</div>
              </div>
              
              <div class="stat-card">
                <div class="stat-card-inner">
                  <div class="stat-icon-wrapper bg-green-light">
                    <span class="stat-icon-emoji">✅</span>
                  </div>
                  <div class="stat-info">
                    <h3 v-if="isLoadingStats" class="stat-loading">...</h3>
                    <h3 v-else class="stat-number">{{ formatMoney(totalDelivered) }}</h3>
                    <p class="stat-label-text">Zilizofika</p>
                  </div>
                </div>
                <div class="stat-trend up">Walengwa wamepokea</div>
              </div>
              
              <div class="stat-card">
                <div class="stat-card-inner">
                  <div class="stat-icon-wrapper bg-orange-light">
                    <span class="stat-icon-emoji">👥</span>
                  </div>
                  <div class="stat-info">
                    <h3 v-if="isLoadingStats" class="stat-loading">...</h3>
                    <h3 v-else class="stat-number">{{ formatMoney(totalContacts) }}</h3>
                    <p class="stat-label-text">Wateja Wote</p>
                  </div>
                </div>
                <div class="stat-trend up">Wanaongezeka</div>
              </div>
              
              <div class="stat-card">
                <div class="stat-card-inner">
                  <div class="stat-icon-wrapper bg-red-light">
                    <span class="stat-icon-emoji">❌</span>
                  </div>
                  <div class="stat-info">
                    <h3 v-if="isLoadingStats" class="stat-loading">...</h3>
                    <h3 v-else class="stat-number">{{ formatMoney(totalFailed) }}</h3>
                    <p class="stat-label-text">Zilizofeli</p>
                  </div>
                </div>
                <div class="stat-trend down">Zinahitaji ufuatiliaji</div>
              </div>
            </div>

            <!-- QUICK ACTIONS -->
            <div class="quick-actions">
              <h3 class="section-title">Vitendo vya Haraka</h3>
              <div class="action-cards">
                <div class="action-card" @click="currentView = 'bulk'">
                  <span class="action-icon">🚀</span>
                  <h4>Tuma Bulk SMS</h4>
                  <p>Fikia wateja wengi kwa wakati mmoja</p>
                </div>
                <div class="action-card" @click="currentView = 'chat'">
                  <span class="action-icon">💬</span>
                  <h4>Jibu Wateja</h4>
                  <p>Endelea na mazungumzo ya moja kwa moja</p>
                </div>
                <div class="action-card" @click="showTopupModal = true">
                  <span class="action-icon">💰</span>
                  <h4>Ongeza Salio</h4>
                  <p>Pandisha salio lako kuendelea kutuma</p>
                </div>
                <div class="action-card" @click="currentView = 'settings'">
                  <span class="action-icon">⚙️</span>
                  <h4>Mipangilio</h4>
                  <p>Angalia API na akaunti yako</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ======================== BULK SMS VIEW ======================== -->
          <div v-else-if="currentView === 'bulk'" key="bulk" class="view-panel">
            <div class="grid-layout">
              <!-- Form Card -->
              <div class="card form-card">
                <div class="card-header">
                  <h3>📋 Tengeneza Kampeni Mpya</h3>
                  <p class="text-muted">Pakia faili la Excel (.xlsx au .csv) lenye namba za wateja wako.</p>
                </div>
                
                <div v-if="!userData?.whatsappPhoneId" class="alert-box warning mb-4">
                  <span class="a-icon">⚠️</span>
                  <div>
                    <strong>Setup Haijakamilika</strong>
                    <p>Hujaweka Namba yako ya WhatsApp API. Nenda kwenye "Mipangilio" kuiweka.</p>
                  </div>
                </div>

                <div class="form-group">
                  <label>Jina la Kampeni <span class="required">*</span></label>
                  <input type="text" v-model="campaignName" class="form-control" placeholder="Mfano: Ofa ya Sikukuu" :disabled="isSending" />
                </div>
                
                <div class="form-row mt-3">
                  <div class="form-group flex-1">
                    <label>Jina la Template <span class="required">*</span></label>
                    <input type="text" v-model="templateNameInput" class="form-control" placeholder="Mfano: weekend_ofa" :disabled="isSending" />
                  </div>
                  <div class="form-group" style="width: 130px;">
                    <label>Lugha</label>
                    <select v-model="templateLanguage" class="form-control" :disabled="isSending">
                      <option value="sw">Kiswahili (sw)</option>
                      <option value="en_US">English (en_US)</option>
                    </select>
                  </div>
                </div>

                <div class="form-group mt-3">
                  <label>Link ya Picha (Optional)</label>
                  <input type="text" v-model="headerImageUrl" class="form-control" placeholder="https://example.com/picha.jpg" :disabled="isSending" />
                </div>

                <div class="upload-zone mt-4" @dragover.prevent @drop.prevent="handleDrop" @click="!selectedFile && !isSending ? $refs.fileInput.click() : null" :class="{ 'has-file': selectedFile, 'disabled-zone': isSending }">
                  <input type="file" ref="fileInput" accept=".xlsx, .xls, .csv" style="display: none" @change="handleFileSelect" />
                  <div v-if="isExtracting" class="upload-state">
                    <span class="upload-icon spinning">⏳</span>
                    <h4>Inasoma Excel yako...</h4>
                    <p>Tafadhali subiri kidogo</p>
                  </div>
                  <div v-else-if="!selectedFile" class="upload-state">
                    <span class="upload-icon">📊</span>
                    <h4>Vuta na udondoshe Excel hapa</h4>
                    <p>au bofya hapa kuchagua faili</p>
                    <span class="upload-hint">Inakubali: .xlsx, .xls, .csv</span>
                  </div>
                  <div v-else class="upload-state">
                    <span class="upload-icon text-green">✅</span>
                    <h4 class="text-green">{{ selectedFile.name }}</h4>
                    <p>Namba zilizopatikana: <strong>{{ parsedContacts.length }}</strong></p>
                    <button class="btn-outline-danger mt-2" @click.stop="clearFile" :disabled="isSending">🗑️ Ondoa Faili</button>
                  </div>
                </div>
              </div>

              <!-- Summary Card -->
              <div class="card summary-card">
                <div class="card-header">
                  <h3>📊 Muhtasari wa Kampeni</h3>
                </div>
                
                <div class="summary-details mt-3">
                  <div class="sum-row">
                    <span class="sum-label">Kampeni</span>
                    <strong class="sum-value">{{ campaignName || '—' }}</strong>
                  </div>
                  <div class="sum-row">
                    <span class="sum-label">Template</span>
                    <strong class="sum-value">{{ templateNameInput || '—' }}</strong>
                  </div>
                  <div class="sum-row">
                    <span class="sum-label">Lugha</span>
                    <strong class="sum-value">{{ templateLanguage === 'sw' ? 'Kiswahili' : 'English' }}</strong>
                  </div>
                  <div class="sum-row">
                    <span class="sum-label">Picha</span>
                    <strong class="sum-value">{{ headerImageUrl ? '✅ Imepakiwa' : '❌ Hakuna' }}</strong>
                  </div>
                  <div class="sum-divider"></div>
                  <div class="sum-row highlight">
                    <span class="sum-label">Wateja wa Kutumiwa</span>
                    <strong class="sum-value large">{{ parsedContacts.length }}</strong>
                  </div>
                  <div class="sum-row highlight">
                    <span class="sum-label">Gharama (TZS 84/SMS)</span>
                    <strong class="sum-value text-red large">TZS {{ formatMoney(parsedContacts.length * 84) }}</strong>
                  </div>
                  <div class="sum-divider"></div>
                  <div class="sum-row">
                    <span class="sum-label">Salio Lako</span>
                    <strong class="sum-value" :class="userData?.walletBalance >= (parsedContacts.length * 84) ? 'text-green' : 'text-red'">
                      TZS {{ formatMoney(userData?.walletBalance) }}
                    </strong>
                  </div>
                </div>
                
                <!-- Conditional Buttons -->
                <div class="summary-actions mt-4">
                  <div v-if="userData?.walletBalance < (parsedContacts.length * 84) && parsedContacts.length > 0" class="alert-box error mb-3">
                    <span class="a-icon">⚠️</span>
                    <div>
                      <strong>Salio Halitoshi</strong>
                      <p>Unahitaji TZS {{ formatMoney((parsedContacts.length * 84) - userData?.walletBalance) }} zaidi.</p>
                    </div>
                  </div>
                  
                  <button v-if="!userData?.whatsappPhoneId" class="btn-primary full-width bg-warning-btn" disabled>
                    ⚠️ Kamilisha Setup ya Meta Kwanza
                  </button>
                  <button v-else-if="userData?.walletBalance < (parsedContacts.length * 84) && parsedContacts.length > 0" class="btn-primary full-width bg-danger-btn" disabled>
                    ⚠️ Salio Lako Halitoshi
                  </button>
                  <button v-else class="btn-primary full-width" :disabled="parsedContacts.length === 0 || isSending || !campaignName || !templateNameInput" @click="sendBulkSMS">
                    <span v-if="isSending" class="loader-small"></span>
                    <span v-else>🚀 Tuma SMS Sasa ({{ parsedContacts.length }} SMS)</span>
                  </button>
                </div>

                <!-- Send Report -->
                <transition name="fade">
                  <div v-if="sendReport" class="report-box mt-3" :class="sendReport.success ? 'report-success' : 'report-danger'">
                    <div class="report-header">
                      <span class="report-icon">{{ sendReport.success ? '✅' : '❌' }}</span>
                      <h4>{{ sendReport.success ? 'Kampeni Imekamilika!' : 'Hitilafu Imetokea' }}</h4>
                    </div>
                    <p v-if="!sendReport.success">{{ sendReport.message }}</p>
                    <div v-else class="report-stats">
                      <div class="report-stat">
                        <span class="report-stat-icon">✅</span>
                        <span class="report-stat-label">Zilizofika</span>
                        <strong class="report-stat-value text-green">{{ sendReport.successCount }}</strong>
                      </div>
                      <div class="report-stat">
                        <span class="report-stat-icon">❌</span>
                        <span class="report-stat-label">Zilizofeli</span>
                        <strong class="report-stat-value text-red">{{ sendReport.failedCount }}</strong>
                      </div>
                      <div class="report-stat">
                        <span class="report-stat-icon">💰</span>
                        <span class="report-stat-label">Salio Jipya</span>
                        <strong class="report-stat-value text-blue">TZS {{ formatMoney(userData?.walletBalance) }}</strong>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>

          <!-- ======================== LIVE CHAT VIEW ======================== -->
          <div v-else-if="currentView === 'chat'" key="chat" class="view-panel chat-layout">
            <!-- Chat Sidebar -->
            <div class="chat-sidebar" :class="{'hide-on-mobile': activeChat !== null}">
              <div class="chat-sidebar-header">
                <h3>💬 Inbox ya Wateja</h3>
                <button class="refresh-btn" @click="fetchContactsSilent" title="Onyesha upya">
                  🔄
                </button>
              </div>
              
              <div class="chat-search">
                <div class="search-wrap">
                  <span class="search-icon">🔍</span>
                  <input type="text" placeholder="Tafuta mteja..." v-model="searchQuery" />
                </div>
              </div>
              
              <div class="chat-list custom-scrollbar">
                <div v-if="filteredContacts.length === 0" class="empty-chat-list">
                  <span class="empty-icon">📭</span>
                  <h4>Hakuna Meseji Bado</h4>
                  <p>Wateja watakapotuma ujumbe, wataonekana hapa</p>
                </div>
                
                <div v-for="contact in filteredContacts" :key="contact.id" 
                     class="contact-item" 
                     :class="{ 'active-contact': activeChat === contact.id }" 
                     @click="openChat(contact)">
                  <div class="contact-avatar" :class="{ 'has-unread': contact.unread > 0 }">
                    {{ contact.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="contact-info">
                    <div class="contact-top">
                      <h4 class="contact-name" :class="{ 'font-bold': contact.unread > 0 }">
                        {{ contact.name }}
                      </h4>
                      <span class="contact-time" :class="{ 'text-green': contact.unread > 0 }">
                        {{ contact.time }}
                      </span>
                    </div>
                    <div class="contact-bottom">
                      <p class="contact-msg" :class="{ 'font-bold text-dark': contact.unread > 0 }">
                        <span v-if="contact.lastSender === 'me'" class="msg-ticks-inline" :class="contact.lastStatus === 'READ' ? 'tick-blue' : 'tick-gray'">
                          <svg v-if="contact.lastStatus === 'DELIVERED' || contact.lastStatus === 'READ'" viewBox="0 0 16 15" width="14" height="14" fill="currentColor">
                            <path d="M15.01 3.316l-4.203 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path>
                            <path d="M10.3 3.316l-4.204 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path>
                          </svg>
                          <svg v-else viewBox="0 0 16 15" width="14" height="14" fill="currentColor">
                            <path d="M10.91 3.316l-4.203 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path>
                          </svg>
                        </span>
                        {{ contact.lastMsg }}
                      </p>
                      <span v-if="contact.unread > 0" class="unread-badge">{{ contact.unread }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Chat Main Area -->
            <div class="chat-main" :class="{'show-on-mobile': activeChat !== null}" v-if="activeChat">
              <div class="active-chat-header">
                <div class="active-profile">
                  <button class="back-btn-mobile" @click="activeChat = null">←</button>
                  <div class="avatar">{{ currentActiveContact?.name?.charAt(0).toUpperCase() || '?' }}</div>
                  <div class="profile-details">
                    <h4>{{ currentActiveContact.name }}</h4>
                    <p>+{{ currentActiveContact.phone }}</p>
                  </div>
                </div>
              </div>

              <div class="chat-messages-area custom-scrollbar" ref="chatScroll">
                <div class="date-divider"><span>{{ currentDate }}</span></div>
                
                <div class="encryption-notice">
                  <span>🔒</span> Ujumbe wote unalindwa. Gharama: <strong>TZS 30/SMS</strong>
                </div>

                <div v-for="msg in chatMessages" :key="msg.id" class="message-row" :class="msg.direction === 'OUTBOUND' ? 'msg-out' : 'msg-in'">
                  <div class="message-bubble" :class="msg.direction === 'OUTBOUND' ? 'bubble-out' : 'bubble-in'">
                    <p class="msg-text">{{ msg.text }}</p>
                    <div class="msg-meta">
                      <span class="msg-time">{{ msg.time }}</span>
                      <span v-if="msg.direction === 'OUTBOUND'" class="msg-ticks" :class="msg.status === 'READ' ? 'tick-blue' : 'tick-gray'">
                        <svg v-if="msg.status === 'SENT' || msg.status === 'PENDING'" viewBox="0 0 16 15" width="14" height="14" fill="currentColor">
                          <path d="M10.91 3.316l-4.203 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path>
                        </svg>
                        <svg v-if="msg.status === 'DELIVERED' || msg.status === 'READ'" viewBox="0 0 16 15" width="14" height="14" fill="currentColor">
                          <path d="M15.01 3.316l-4.203 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path>
                          <path d="M10.3 3.316l-4.204 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path>
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="chat-input-area">
                <input 
                  type="text" 
                  v-model="newChatMessage" 
                  placeholder="Andika ujumbe hapa..." 
                  @keyup.enter="sendLiveMessage" 
                  :disabled="isSendingChat || userData?.walletBalance < 30 || !userData?.whatsappPhoneId"
                />
                <button 
                  class="send-btn" 
                  @click="sendLiveMessage" 
                  :disabled="!newChatMessage.trim() || isSendingChat || userData?.walletBalance < 30 || !userData?.whatsappPhoneId"
                >
                  <span v-if="isSendingChat" class="loader-small"></span>
                  <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Empty Chat View -->
            <div class="chat-main empty-state" v-else>
              <div class="empty-chat-content">
                <div class="empty-chat-icon">💬</div>
                <h2>KEDESH Live Chat</h2>
                <p>Bofya jina la mteja upande wa kushoto kuanza mazungumzo.</p>
                <div class="empty-chat-features">
                  <span>🔒 Imesimbwa</span>
                  <span>⚡ Inafika Papo Hapo</span>
                  <span>💰 TZS 30/SMS</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ======================== SETTINGS VIEW ======================== -->
          <div v-else-if="currentView === 'settings'" key="settings" class="view-panel">
            <div class="settings-container">
              <div class="card settings-card">
                <div class="settings-header">
                  <div class="settings-icon">🛡️</div>
                  <h2>Mipangilio ya Akaunti</h2>
                  <p>Taarifa zako za WhatsApp API zimehifadhiwa kwa usalama</p>
                </div>
                
                <!-- IKIWA SETUP IMekamilika -->
                <div v-if="userData?.whatsappPhoneId && userData?.wabaId" class="api-details">
                  <div class="api-status-badge connected">
                    <span class="pulse-dot green"></span>
                    Imeshikamana na Meta API
                  </div>
                  
                  <div class="detail-card">
                    <div class="detail-header">
                      <span class="detail-icon">🏢</span>
                      <h4>Jina la Biashara</h4>
                    </div>
                    <p class="detail-value">{{ userData.businessName }}</p>
                  </div>
                  
                  <div class="detail-card">
                    <div class="detail-header">
                      <span class="detail-icon">🔑</span>
                      <h4>WhatsApp Business Account ID (WABA)</h4>
                    </div>
                    <p class="detail-value mono">{{ userData.wabaId }}</p>
                  </div>

                  <div class="detail-card">
                    <div class="detail-header">
                      <span class="detail-icon">📱</span>
                      <h4>Phone Number ID</h4>
                    </div>
                    <p class="detail-value mono">{{ userData.whatsappPhoneId }}</p>
                  </div>

                  <div class="alert-box info mt-4">
                    <span class="a-icon">ℹ️</span>
                    <div>
                      <strong>Taarifa Muhimu</strong>
                      <p>Namba hizi zimesomwa kiotomatiki kutoka Meta. Hazibadiliki isipokuwa Admin afanye mabadiliko.</p>
                    </div>
                  </div>
                </div>

                <!-- IKIWA SETUP HAIJAKAMILIKA -->
                <div v-else class="api-details">
                  <div class="api-status-badge warning">
                    <span class="pulse-dot orange"></span>
                    Setup Haijakamilika
                  </div>
                  
                  <div class="setup-instructions">
                    <div class="instruction-step">
                      <span class="step-number">1</span>
                      <div>
                        <h4>Toka kwenye mfumo</h4>
                        <p>Bofya kitufe cha "Toka" na urudi kwenye ukurasa wa kuingia</p>
                      </div>
                    </div>
                    <div class="instruction-step">
                      <span class="step-number">2</span>
                      <div>
                        <h4>Ingia kupitia Facebook</h4>
                        <p>Tumia kitufe cha "Endelea na Facebook" kuingia tena</p>
                      </div>
                    </div>
                    <div class="instruction-step">
                      <span class="step-number">3</span>
                      <div>
                        <h4>Kamilisha Ruhusa Zote</h4>
                        <p>Hakikisha unaruhusu WhatsApp Business Management na kuthibitisha namba yako</p>
                      </div>
                    </div>
                  </div>
                  
                  <button class="btn-primary full-width mt-4" @click="$emit('logout')">
                    🔄 Toka na Ujaribu Upya
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
// 🚀 SOCKET.IO LOGIC
// ==========================================
let socket = null;
const isSocketConnected = ref(false);
let notificationSound = null;

const initSocket = () => {
    const token = localStorage.getItem('msamba_token');
    if(!token) return;

    // Initialize audio lazily
    try {
        notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    } catch(e) {
        console.log('Audio not supported');
    }

    socket = io("https://apibulksms.kedeshlimited.com", {
        auth: { token: token },
        transports: ['websocket', 'polling']
    });

    socket.on("connect", () => { 
        isSocketConnected.value = true; 
        console.log('Socket connected');
    });
    
    socket.on("disconnect", () => { 
        isSocketConnected.value = false; 
        console.log('Socket disconnected');
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
      
      if (res.data.success) {
         sendReport.value = { 
             success: true, 
             message: res.data.message, 
             successCount: res.data.stats?.success || 0, 
             failedCount: res.data.stats?.failed || 0 
         };
         if(res.data.newBalance !== undefined) {
             userData.value.walletBalance = res.data.newBalance;
         }
         fetchDashboardStats(false);
      }
   } catch (error) { 
      sendReport.value = { 
          success: false, 
          message: error.response?.data?.error || "Kosa la kimtandao limetokea." 
      }; 
   } finally { 
       isSending.value = false; 
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
  if (!searchQuery.value) return chatContacts.value;
  const query = searchQuery.value.toLowerCase();
  return chatContacts.value.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone.includes(query)
  );
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
    fetchContacts(); 
});

onUnmounted(() => { 
    stopStatsPolling(); 
    if(socket) socket.disconnect(); 
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

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
  background: #f1f5f9; 
  overflow: hidden; 
}

/* ======== MODAL ======== */
.modal-overlay { 
  position: fixed; 
  top: 0; 
  left: 0; 
  width: 100%; 
  height: 100%; 
  background: rgba(0,0,0,0.6); 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  z-index: 1000; 
  backdrop-filter: blur(8px);
  padding: 20px;
}

.modal-card { 
  background: white; 
  width: 100%; 
  max-width: 480px; 
  border-radius: 24px; 
  box-shadow: 0 25px 50px rgba(0,0,0,0.25); 
  overflow: hidden; 
  animation: modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
}

@keyframes modalSlideIn { 
  from { transform: translateY(40px) scale(0.95); opacity: 0; } 
  to { transform: translateY(0) scale(1); opacity: 1; } 
}

.modal-header { 
  background: linear-gradient(135deg, #0f172a, #1e293b); 
  color: white; 
  padding: 24px 28px; 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
}

.modal-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon {
  font-size: 1.5rem;
}

.modal-header h3 { 
  margin: 0; 
  font-size: 1.2rem; 
  font-weight: 700;
}

.close-btn { 
  background: rgba(255,255,255,0.15); 
  border: none; 
  color: white; 
  font-size: 1.8rem; 
  cursor: pointer; 
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.3s;
}

.close-btn:hover {
  background: rgba(255,255,255,0.25);
}

.modal-body { 
  padding: 32px; 
}

.wallet-icon-large { 
  font-size: 4.5rem; 
  text-align: center;
  margin-bottom: 16px;
}

.modal-title {
  text-align: center;
  color: #0f172a;
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 12px;
}

.modal-description {
  text-align: center;
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.7;
  margin-bottom: 24px;
}

.payment-methods {
  margin-bottom: 20px;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f0fdf4;
  border: 2px solid #10b981;
  border-radius: 12px;
}

.payment-method .method-icon {
  font-size: 1.5rem;
}

.payment-method strong {
  color: #0f172a;
  font-size: 0.95rem;
}

.payment-method p {
  color: #64748b;
  font-size: 0.85rem;
  margin-top: 2px;
}

.contact-admin { 
  background: #f8fafc; 
  padding: 20px; 
  border-radius: 12px; 
  border: 1px dashed #cbd5e1; 
}

.contact-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.contact-row:first-child {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.contact-label {
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 500;
}

.contact-value {
  color: #0f172a;
  font-size: 1.1rem;
  font-weight: 800;
}

/* ======== SIDEBAR ======== */
.sidebar { 
  width: 280px; 
  background: linear-gradient(180deg, #0b1121 0%, #0f172a 100%); 
  color: white; 
  display: flex; 
  flex-direction: column; 
  z-index: 10; 
  flex-shrink: 0;
}

.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px 16px;
}

.brand { 
  display: flex; 
  align-items: center; 
  gap: 14px; 
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  margin-bottom: 20px;
}

.brand-logo-wrapper {
  flex-shrink: 0;
}

.brand-logo { 
  height: 40px; 
  object-fit: contain;
}

.brand-text h2 { 
  font-size: 1rem; 
  font-weight: 800; 
  letter-spacing: 0.5px;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.brand-badge {
  font-size: 0.7rem;
  background: rgba(79, 70, 229, 0.2);
  color: #a5b4fc;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 600;
  display: inline-block;
  margin-top: 4px;
}

.nav-menu { 
  flex: 1; 
  overflow-y: auto; 
}

.menu-label { 
  font-size: 0.7rem; 
  color: #64748b; 
  font-weight: 700; 
  margin-bottom: 10px; 
  padding-left: 12px;
  letter-spacing: 1.5px; 
  text-transform: uppercase;
}

.nav-btn { 
  position: relative; 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  width: 100%; 
  padding: 12px 16px; 
  background: transparent; 
  border: none; 
  color: #94a3b8; 
  font-size: 0.95rem; 
  font-weight: 600; 
  border-radius: 10px; 
  cursor: pointer; 
  transition: 0.3s; 
  margin-bottom: 4px; 
  text-align: left;
}

.nav-btn:hover { 
  background: rgba(255,255,255,0.06); 
  color: #e2e8f0; 
}

.nav-btn.active { 
  background: linear-gradient(135deg, #4f46e5, #3730a3); 
  color: white; 
  box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3); 
}

.nav-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
}

.nav-text {
  flex: 1;
}

.nav-arrow {
  font-size: 1.2rem;
  font-weight: 700;
  opacity: 0.7;
}

.unread-badge-sidebar { 
  background: #ef4444; 
  color: white; 
  padding: 2px 8px; 
  border-radius: 10px; 
  font-size: 0.75rem; 
  font-weight: 700;
  min-width: 22px;
  text-align: center;
}

.mt-4 { margin-top: 1.5rem; }

.sidebar-footer { 
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 20px;
}

.wallet-card-mini { 
  background: linear-gradient(135deg, #10b981, #059669); 
  padding: 16px; 
  border-radius: 14px; 
  margin-bottom: 16px; 
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.25); 
}

.wallet-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.wallet-label {
  font-size: 0.8rem;
  opacity: 0.9;
  font-weight: 500;
}

.wallet-currency {
  font-size: 0.75rem;
  background: rgba(255,255,255,0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.wallet-amount { 
  font-size: 1.6rem; 
  font-weight: 800; 
  margin-bottom: 12px; 
  letter-spacing: -0.5px;
}

.topup-btn { 
  background: rgba(255,255,255,0.2); 
  color: white; 
  border: none; 
  padding: 10px; 
  width: 100%; 
  border-radius: 8px; 
  font-weight: 600; 
  cursor: pointer; 
  transition: 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.topup-btn:hover { 
  background: white; 
  color: #059669; 
}

.user-profile-mini { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  padding: 12px; 
  background: rgba(255,255,255,0.05); 
  border-radius: 12px; 
}

.user-avatar { 
  width: 42px; 
  height: 42px; 
  background: #4f46e5; 
  border-radius: 10px; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  font-weight: 700; 
  font-size: 1.2rem; 
  flex-shrink: 0;
}

.user-details { 
  flex: 1;
  overflow: hidden;
}

.user-details h4 { 
  font-size: 0.85rem; 
  margin-bottom: 2px; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  max-width: 130px;
  font-weight: 600;
} 

.user-details p { 
  font-size: 0.75rem; 
  color: #94a3b8; 
}

.logout-icon-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  color: #94a3b8;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-icon-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* ======== MAIN CONTENT ======== */
.main-content { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  overflow: hidden; 
}

.topbar { 
  height: 72px; 
  background: white; 
  border-bottom: 1px solid #e2e8f0; 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 0 32px; 
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
}

.page-title h1 { 
  font-size: 1.4rem; 
  color: #0f172a; 
  font-weight: 800; 
  letter-spacing: -0.5px;
}

.date-text { 
  font-size: 0.8rem; 
  color: #64748b; 
  margin-top: 2px; 
  font-weight: 500;
}

.topbar-right { 
  display: flex; 
  align-items: center; 
  gap: 16px; 
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid;
}

.status-indicator.connected {
  background: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
}

.status-indicator.disconnected {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.status-indicator.warning {
  background: #fffbeb;
  color: #b45309;
  border-color: #fde68a;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.connected .status-dot {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
  animation: pulseGreen 2s infinite;
}

.disconnected .status-dot {
  background: #ef4444;
}

.warning .status-dot {
  background: #f59e0b;
  animation: pulseOrange 2s infinite;
}

@keyframes pulseGreen { 
  70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); } 
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } 
}

@keyframes pulseOrange { 
  70% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); } 
  100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } 
}

.logout-btn-top { 
  background: #fee2e2; 
  color: #ef4444; 
  border: none; 
  padding: 8px 16px; 
  border-radius: 10px; 
  font-weight: 600; 
  cursor: pointer; 
  transition: 0.3s; 
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

.logout-btn-top:hover { 
  background: #fca5a5; 
  color: white;
}

.content-area { 
  flex: 1; 
  padding: 32px; 
  overflow-y: auto; 
}

.view-panel { 
  height: 100%; 
}

/* ======== SETUP BANNER ======== */
.setup-banner {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border: 2px solid #f59e0b;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 24px;
}

.setup-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.setup-content h3 {
  color: #92400e;
  font-size: 1.2rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.setup-content p {
  color: #78350f;
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 16px;
}

.setup-actions {
  display: flex;
  gap: 12px;
}

.btn-setup {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.3s;
}

.btn-setup:hover {
  background: #d97706;
}

.btn-setup-secondary {
  background: white;
  color: #92400e;
  border: 2px solid #f59e0b;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.3s;
}

/* ======== WELCOME BANNER ======== */
.welcome-banner { 
  background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); 
  border-radius: 24px; 
  padding: 40px; 
  color: white; 
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
}

.welcome-banner::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  border-radius: 50%;
}

.banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

.banner-text-section {
  flex: 1;
}

.greeting-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.15);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 16px;
  backdrop-filter: blur(10px);
}

.wave-emoji {
  animation: wave 2s infinite;
  transform-origin: 70% 70%;
}

@keyframes wave {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  50% { transform: rotate(10deg); }
  75% { transform: rotate(-10deg); }
}

.banner-text-section h2 { 
  font-size: 2rem; 
  font-weight: 800; 
  margin-bottom: 12px; 
  letter-spacing: -1px;
}

.banner-text-section p { 
  font-size: 1rem; 
  opacity: 0.9; 
  line-height: 1.6; 
  max-width: 500px;
}

.banner-stats {
  display: flex;
  gap: 24px;
  margin-top: 20px;
}

.banner-stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.banner-stat-number {
  font-size: 1.3rem;
  font-weight: 800;
}

.banner-stat-label {
  font-size: 0.75rem;
  opacity: 0.7;
  font-weight: 500;
}

.banner-stat-divider {
  width: 1px;
  background: rgba(255,255,255,0.2);
}

.banner-illustration {
  position: relative;
  width: 200px;
  height: 200px;
  flex-shrink: 0;
}

.illustration-circle {
  width: 140px;
  height: 140px;
  background: rgba(255,255,255,0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 30px auto;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255,255,255,0.2);
}

.illustration-icon {
  font-size: 4rem;
}

.illustration-floating {
  position: absolute;
  font-size: 2rem;
  animation: float 3s ease-in-out infinite;
}

.floating-1 { top: 10px; right: 30px; animation-delay: 0s; }
.floating-2 { bottom: 40px; left: 20px; animation-delay: 1s; }
.floating-3 { top: 60px; left: 10px; animation-delay: 2s; }

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.btn-banner { 
  background: white; 
  color: #4f46e5; 
  border: none; 
  padding: 14px 28px; 
  border-radius: 12px; 
  font-weight: 700; 
  font-size: 1rem; 
  cursor: pointer; 
  transition: 0.3s;
  position: relative;
  z-index: 1;
}

.btn-banner:hover:not(:disabled) { 
  transform: translateY(-2px); 
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}

.btn-banner:disabled { 
  background: #cbd5e1; 
  cursor: not-allowed; 
  transform: none;
  color: #64748b;
}

/* ======== STATS GRID ======== */
.stats-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); 
  gap: 20px; 
  margin-bottom: 32px;
}

.stat-card { 
  background: white; 
  padding: 24px; 
  border-radius: 16px; 
  border: 1px solid #e2e8f0; 
  transition: all 0.3s ease; 
}

.stat-card:hover { 
  transform: translateY(-4px); 
  box-shadow: 0 12px 30px rgba(0,0,0,0.08); 
}

.stat-card-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.stat-icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bg-blue-light { background: #eff6ff; }
.bg-green-light { background: #f0fdf4; }
.bg-orange-light { background: #fff7ed; }
.bg-red-light { background: #fef2f2; }

.stat-icon-emoji {
  font-size: 1.5rem;
}

.stat-info {
  flex: 1;
}

.stat-number { 
  font-size: 1.8rem; 
  color: #0f172a; 
  font-weight: 800; 
  letter-spacing: -0.5px;
}

.stat-label-text { 
  font-size: 0.85rem; 
  color: #64748b; 
  font-weight: 600; 
  margin-top: 2px;
}

.stat-loading {
  color: #94a3b8;
  font-size: 1.5rem;
}

.stat-trend {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 8px;
  display: inline-block;
}

.stat-trend.up {
  background: #ecfdf5;
  color: #059669;
}

.stat-trend.down {
  background: #fef2f2;
  color: #dc2626;
}

/* ======== QUICK ACTIONS ======== */
.quick-actions {
  margin-bottom: 32px;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 20px;
}

.action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.action-card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.08);
  border-color: #4f46e5;
}

.action-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 12px;
}

.action-card h4 {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 6px;
}

.action-card p {
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.4;
}

/* ======== BULK SMS ======== */
.grid-layout { 
  display: grid; 
  grid-template-columns: 2fr 1fr; 
  gap: 24px; 
}

.card { 
  background: white; 
  padding: 32px; 
  border-radius: 20px; 
  border: 1px solid #e2e8f0; 
}

.card-header {
  margin-bottom: 24px;
}

.card-header h3 {
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 6px;
}

.text-muted {
  color: #64748b;
  font-size: 0.9rem;
}

.form-group { 
  margin-bottom: 1.5rem; 
}

.form-group label { 
  display: block; 
  font-weight: 600; 
  color: #334155; 
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.required {
  color: #ef4444;
}

.form-control { 
  width: 100%; 
  padding: 12px 16px; 
  border: 2px solid #e2e8f0; 
  border-radius: 10px; 
  font-size: 0.95rem; 
  outline: none; 
  background: #f8fafc;
  transition: 0.3s;
}

.form-control:focus { 
  border-color: #4f46e5; 
  background: white;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.form-control:disabled { 
  background: #f1f5f9; 
  cursor: not-allowed; 
  color: #94a3b8; 
}

.form-row { 
  display: flex; 
  gap: 16px; 
}

.flex-1 { 
  flex: 1; 
}

.upload-zone { 
  border: 2px dashed #cbd5e1; 
  border-radius: 16px; 
  padding: 40px 24px; 
  text-align: center; 
  background: #f8fafc; 
  cursor: pointer; 
  transition: 0.3s;
}

.upload-zone:hover { 
  border-color: #4f46e5; 
  background: #f0f0ff;
}

.upload-zone.has-file { 
  border: 2px solid #10b981; 
  background: #ecfdf5; 
}

.upload-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon { 
  font-size: 3rem; 
}

.spinning {
  animation: spin 2s linear infinite;
}

@keyframes spin { 
  to { transform: rotate(360deg); } 
}

.upload-state h4 { 
  color: #0f172a; 
  font-weight: 700;
}

.upload-state p { 
  color: #64748b; 
  font-size: 0.9rem; 
}

.upload-hint {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 500;
}

.text-green { 
  color: #10b981; 
}

.btn-outline-danger { 
  background: white; 
  color: #ef4444; 
  border: 2px solid #fecaca; 
  padding: 8px 16px; 
  border-radius: 8px; 
  font-weight: 600; 
  cursor: pointer; 
  transition: 0.3s;
  font-size: 0.85rem;
}

.btn-outline-danger:hover { 
  background: #fef2f2; 
}

/* Summary Card */
.summary-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sum-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sum-label {
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 500;
}

.sum-value {
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 600;
}

.sum-value.large {
  font-size: 1.2rem;
}

.sum-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 8px 0;
}

.summary-actions {
  margin-top: 8px;
}

/* Buttons */
.btn-primary { 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  background: linear-gradient(135deg, #4f46e5, #3730a3); 
  color: white; 
  border: none; 
  padding: 14px 24px; 
  border-radius: 12px; 
  font-weight: 600; 
  font-size: 1rem; 
  cursor: pointer; 
  transition: 0.3s;
  gap: 8px;
}

.btn-primary:hover:not(:disabled) { 
  transform: translateY(-2px); 
  box-shadow: 0 8px 25px rgba(79, 70, 229, 0.3);
}

.btn-primary:disabled { 
  background: #cbd5e1; 
  cursor: not-allowed; 
  transform: none; 
  color: #94a3b8;
}

.bg-warning-btn {
  background: #f59e0b;
}

.bg-danger-btn {
  background: #ef4444;
}

.full-width { 
  width: 100%; 
}

/* Report Box */
.report-box { 
  padding: 20px; 
  border-radius: 12px; 
}

.report-success { 
  background: #ecfdf5; 
  border: 1px solid #a7f3d0; 
}

.report-danger { 
  background: #fef2f2; 
  border: 1px solid #fecaca; 
}

.report-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.report-icon {
  font-size: 1.5rem;
}

.report-header h4 {
  font-weight: 700;
  color: #0f172a;
}

.report-stats {
  display: flex;
  gap: 16px;
}

.report-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  background: white;
  padding: 12px;
  border-radius: 10px;
}

.report-stat-icon {
  font-size: 1.2rem;
}

.report-stat-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

.report-stat-value {
  font-size: 1.2rem;
  font-weight: 800;
}

.text-red { color: #ef4444; }
.text-blue { color: #3b82f6; }
.text-green { color: #10b981; }

/* ======== LIVE CHAT ======== */
.chat-layout { 
  display: flex; 
  background: white; 
  border-radius: 20px; 
  overflow: hidden; 
  border: 1px solid #e2e8f0; 
  height: calc(100vh - 160px); 
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

.chat-sidebar { 
  width: 350px; 
  border-right: 1px solid #e2e8f0; 
  display: flex; 
  flex-direction: column; 
  background: white; 
  flex-shrink: 0;
}

.chat-sidebar-header { 
  padding: 20px; 
  border-bottom: 1px solid #e2e8f0; 
  display: flex; 
  justify-content: space-between; 
  align-items: center;
}

.chat-sidebar-header h3 { 
  color: #0f172a; 
  font-size: 1.1rem; 
  font-weight: 700;
}

.refresh-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  transition: 0.3s;
  padding: 4px 8px;
  border-radius: 8px;
}

.refresh-btn:hover {
  background: #f1f5f9;
}

.chat-search { 
  padding: 12px 16px; 
  border-bottom: 1px solid #e2e8f0; 
}

.search-wrap { 
  display: flex; 
  align-items: center; 
  background: #f1f5f9; 
  border-radius: 10px; 
  padding: 10px 16px; 
}

.search-icon { 
  font-size: 0.9rem; 
  margin-right: 10px; 
}

.search-wrap input { 
  flex: 1; 
  border: none; 
  background: transparent; 
  outline: none; 
  font-size: 0.9rem; 
  color: #334155;
}

.chat-list { 
  flex: 1; 
  overflow-y: auto; 
}

.empty-chat-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.empty-chat-list h4 {
  color: #0f172a;
  font-weight: 700;
  margin-bottom: 8px;
}

.empty-chat-list p {
  color: #64748b;
  font-size: 0.9rem;
}

.contact-item { 
  display: flex; 
  align-items: center; 
  padding: 14px 16px; 
  cursor: pointer; 
  border-bottom: 1px solid #f1f5f9; 
  transition: 0.2s;
  gap: 14px;
}

.contact-item:hover { 
  background: #f8fafc; 
}

.active-contact { 
  background: #eff6ff !important; 
  border-left: 4px solid #4f46e5;
}

.contact-avatar { 
  width: 48px; 
  height: 48px; 
  background: #e2e8f0; 
  color: #64748b; 
  border-radius: 50%; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  font-size: 1.2rem; 
  font-weight: 700; 
  flex-shrink: 0;
}

.contact-avatar.has-unread {
  background: linear-gradient(135deg, #4f46e5, #3730a3);
  color: white;
}

.contact-info { 
  flex: 1; 
  overflow: hidden; 
}

.contact-top { 
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  margin-bottom: 4px; 
}

.contact-name { 
  font-size: 0.95rem; 
  color: #0f172a; 
  font-weight: 600; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis;
}

.font-bold { 
  font-weight: 700; 
}

.contact-time { 
  font-size: 0.75rem; 
  color: #64748b; 
  font-weight: 500;
  flex-shrink: 0;
  margin-left: 8px;
}

.contact-bottom { 
  display: flex; 
  justify-content: space-between; 
  align-items: center;
}

.contact-msg { 
  font-size: 0.85rem; 
  color: #64748b; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  flex: 1;
}

.text-dark { 
  color: #0f172a; 
}

.msg-ticks-inline { 
  margin-right: 4px; 
}

.tick-gray { 
  color: #8696a0; 
}

.tick-blue { 
  color: #53bdeb; 
}

.unread-badge { 
  background: #10b981; 
  color: white; 
  font-size: 0.7rem; 
  font-weight: 700; 
  padding: 2px 7px; 
  border-radius: 10px; 
  min-width: 20px; 
  text-align: center;
  flex-shrink: 0;
  margin-left: 8px;
}

/* Chat Main */
.chat-main { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  background: #efeae2; 
}

.active-chat-header { 
  height: 64px; 
  background: #f0f2f5; 
  padding: 0 24px; 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  border-bottom: 1px solid #d1d7db; 
}

.active-profile { 
  display: flex; 
  align-items: center; 
  gap: 12px;
}

.active-profile .avatar { 
  width: 40px; 
  height: 40px; 
  background: #94a3b8; 
  border-radius: 50%; 
  color: white; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  font-weight: 700; 
}

.profile-details h4 { 
  color: #111b21; 
  font-size: 1rem; 
  margin-bottom: 2px;
  font-weight: 600;
}

.profile-details p { 
  color: #667781; 
  font-size: 0.8rem; 
}

.chat-messages-area { 
  flex: 1; 
  padding: 24px 8%; 
  overflow-y: auto; 
  background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); 
  background-size: contain; 
  display: flex; 
  flex-direction: column; 
  gap: 4px; 
}

.custom-scrollbar::-webkit-scrollbar { 
  width: 6px; 
}

.custom-scrollbar::-webkit-scrollbar-track { 
  background: transparent; 
}

.custom-scrollbar::-webkit-scrollbar-thumb { 
  background: rgba(0,0,0,0.15); 
  border-radius: 10px; 
}

.encryption-notice { 
  background: #ffeecd; 
  color: #54656f; 
  font-size: 0.8rem; 
  text-align: center; 
  padding: 8px 16px; 
  border-radius: 10px; 
  align-self: center; 
  margin-bottom: 16px; 
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.date-divider { 
  text-align: center; 
  margin: 16px 0; 
}

.date-divider span { 
  background: #ffffff; 
  color: #54656f; 
  font-size: 0.8rem; 
  padding: 6px 14px; 
  border-radius: 10px; 
  box-shadow: 0 1px 2px rgba(0,0,0,0.1); 
  font-weight: 600;
}

.message-row { 
  display: flex; 
  width: 100%; 
  margin-bottom: 4px; 
}

.msg-out { 
  justify-content: flex-end; 
}

.msg-in { 
  justify-content: flex-start; 
}

.message-bubble { 
  max-width: 65%; 
  padding: 8px 12px 6px 12px; 
  border-radius: 8px; 
  position: relative; 
  box-shadow: 0 1px 1px rgba(0,0,0,0.1); 
}

.bubble-out { 
  background: #d9fdd3; 
  border-top-right-radius: 0; 
}

.bubble-in { 
  background: #ffffff; 
  border-top-left-radius: 0; 
}

.msg-text { 
  font-size: 0.9rem; 
  color: #111b21; 
  line-height: 1.45; 
  padding-bottom: 18px; 
  word-wrap: break-word; 
}

.msg-meta { 
  position: absolute; 
  bottom: 4px; 
  right: 8px; 
  display: flex; 
  align-items: center; 
  gap: 4px; 
}

.msg-time { 
  font-size: 0.65rem; 
  color: #667781; 
}

.msg-ticks { 
  display: flex; 
  align-items: center; 
}

.chat-input-area { 
  background: #f0f2f5; 
  padding: 12px 20px; 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  border-top: 1px solid #d1d7db; 
}

.chat-input-area input { 
  flex: 1; 
  padding: 12px 20px; 
  border-radius: 24px; 
  border: none; 
  outline: none; 
  font-size: 0.95rem; 
  box-shadow: 0 1px 2px rgba(0,0,0,0.05); 
}

.chat-input-area input:disabled {
  background: #e2e8f0;
  cursor: not-allowed;
}

.send-btn { 
  background: #00a884; 
  width: 44px; 
  height: 44px; 
  border-radius: 50%; 
  border: none; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  cursor: pointer; 
  transition: 0.2s; 
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) { 
  background: #019071; 
}

.send-btn:disabled { 
  background: #94a3b8; 
  cursor: not-allowed; 
}

/* Empty Chat State */
.chat-main.empty-state {
  background: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-chat-content {
  text-align: center;
  padding: 40px;
}

.empty-chat-icon {
  font-size: 5rem;
  margin-bottom: 20px;
}

.empty-chat-content h2 {
  color: #41525d;
  font-weight: 300;
  margin-bottom: 12px;
}

.empty-chat-content p {
  color: #667781;
  font-size: 0.95rem;
  margin-bottom: 24px;
}

.empty-chat-features {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.empty-chat-features span {
  background: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.8rem;
  color: #54656f;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

/* ======== SETTINGS ======== */
.settings-container {
  max-width: 700px;
  margin: 0 auto;
}

.settings-card { 
  padding: 40px;
}

.settings-header {
  text-align: center;
  margin-bottom: 32px;
}

.settings-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.settings-header h2 {
  font-size: 1.6rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 8px;
}

.settings-header p {
  color: #64748b;
  font-size: 0.95rem;
}

.api-status-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 24px;
  justify-content: center;
}

.api-status-badge.connected {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.api-status-badge.warning {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.pulse-dot.green {
  background: #10b981;
  animation: pulseGreen 2s infinite;
}

.pulse-dot.orange {
  background: #f59e0b;
  animation: pulseOrange 2s infinite;
}

.detail-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.detail-icon {
  font-size: 1.2rem;
}

.detail-header h4 {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 600;
}

.detail-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
}

.detail-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 0.95rem;
  letter-spacing: 0.5px;
  background: white;
  padding: 8px 12px;
  border-radius: 8px;
  word-break: break-all;
}

.setup-instructions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.instruction-step {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.step-number {
  width: 36px;
  height: 36px;
  background: #4f46e5;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.instruction-step h4 {
  color: #0f172a;
  font-weight: 700;
  margin-bottom: 4px;
}

.instruction-step p {
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* ======== ALERTS ======== */
.alert-box { 
  padding: 14px 16px; 
  border-radius: 12px; 
  font-size: 0.9rem; 
  display: flex; 
  align-items: flex-start; 
  gap: 10px; 
}

.alert-box .a-icon { 
  font-size: 1.2rem; 
  flex-shrink: 0;
  margin-top: 2px;
}

.alert-box strong {
  display: block;
  font-weight: 700;
  margin-bottom: 2px;
}

.alert-box p {
  margin: 0;
  font-weight: 400;
}

.alert-box.info { 
  background: #eff6ff; 
  color: #1e40af; 
  border: 1px solid #bfdbfe; 
}

.alert-box.warning { 
  background: #fffbeb; 
  color: #92400e; 
  border: 1px solid #fde68a; 
}

.alert-box.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

/* ======== TRANSITIONS ======== */
.fade-enter-active, .fade-leave-active { 
  transition: opacity 0.3s ease, transform 0.3s ease; 
}

.fade-enter-from, .fade-leave-to { 
  opacity: 0; 
  transform: translateY(10px); 
}

.fade-slide-enter-active, .fade-slide-leave-active { 
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
}

.fade-slide-enter-from { 
  opacity: 0; 
  transform: scale(0.98) translateY(10px); 
}

.fade-slide-leave-to { 
  opacity: 0; 
  transform: scale(1.02) translateY(-10px); 
}

/* ======== LOADER ======== */
.loader-small { 
  display: inline-block; 
  border: 3px solid rgba(255,255,255,0.3); 
  border-top: 3px solid white; 
  border-radius: 50%; 
  width: 20px; 
  height: 20px; 
  animation: spin 1s linear infinite; 
}

/* ======== RESPONSIVE ======== */
.back-btn-mobile { 
  display: none; 
  background: none; 
  border: none; 
  font-size: 1.3rem; 
  margin-right: 10px; 
  cursor: pointer; 
}

@media (max-width: 992px) {
  .dashboard-layout { 
    flex-direction: column; 
    overflow-y: auto; 
  }
  
  .sidebar { 
    width: 100%; 
    flex-shrink: 1;
  }
  
  .sidebar-inner {
    padding: 16px;
  }
  
  .nav-menu { 
    display: flex; 
    overflow-x: auto; 
    gap: 8px; 
    padding: 0; 
    margin-bottom: 12px; 
    flex-direction: row;
  }
  
  .menu-label { 
    display: none; 
  }
  
  .nav-btn { 
    width: auto; 
    white-space: nowrap; 
    padding: 10px 14px; 
    margin: 0; 
  }
  
  .nav-text {
    display: none;
  }
  
  .sidebar-footer { 
    display: none; 
  }
  
  .topbar { 
    padding: 16px; 
    height: auto; 
    flex-direction: column; 
    gap: 12px; 
  }
  
  .topbar-right { 
    flex-wrap: wrap; 
    width: 100%; 
  }
  
  .content-area { 
    padding: 16px; 
  }
  
  .grid-layout { 
    grid-template-columns: 1fr; 
  }
  
  .banner-illustration {
    display: none;
  }
  
  .chat-layout { 
    flex-direction: column; 
    height: 80vh; 
  }
  
  .chat-sidebar.hide-on-mobile { 
    display: none; 
  }
  
  .chat-sidebar { 
    width: 100%; 
    height: 100%; 
    border-right: none; 
  }
  
  .chat-main { 
    display: none; 
    width: 100%; 
    height: 100%; 
  }
  
  .chat-main.show-on-mobile { 
    display: flex; 
  }
  
  .chat-main.empty-state { 
    display: none; 
  }
  
  .back-btn-mobile { 
    display: block; 
  }
  
  .message-bubble { 
    max-width: 85%; 
  }
  
  .banner-stats {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .welcome-banner {
    padding: 24px;
  }
  
  .banner-text-section h2 {
    font-size: 1.5rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .action-cards {
    grid-template-columns: 1fr 1fr;
  }
  
  .card {
    padding: 20px;
  }
  
  .settings-card {
    padding: 24px;
  }
  
  .modal-card {
    margin: 16px;
  }
}
</style>