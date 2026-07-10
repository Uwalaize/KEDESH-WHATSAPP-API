<template>
  <div class="dashboard-layout">
    
    <!-- MODAL YA KUONGEZA SALIO -->
    <transition name="fade">
      <div v-if="showTopupModal" class="modal-overlay" @click.self="showTopupModal = false">
        <div class="modal-card">
          <div class="modal-header">
            <h3>💳 Weka Salio kwenye Akaunti</h3>
            <button class="close-btn" @click="showTopupModal = false">×</button>
          </div>
          <div class="modal-body text-center">
            <div class="wallet-icon-large">💰</div>
            <h2 style="color: #0f172a; margin-bottom: 10px;">Lipa na Ongeza Salio</h2>
            <p class="text-muted mt-2" style="line-height: 1.6;">
              Tafadhali fanya malipo kwa kutuma kiasi unachotaka kwenye namba ya ofisi hapa chini. Baada ya muamala kukamilika, wasiliana na Admin ili kupandishiwa salio lako papo hapo.
            </p>
            
            <div class="contact-admin mt-4">
              <span style="font-size: 0.9rem; color: #64748b;">Lipa Kupitia (M-Pesa / TigoPesa / Airtel Money):</span><br>
              <strong class="text-green" style="font-size: 1.4rem; display: block; margin-top: 5px;">0667 961 231</strong>
              <span style="font-size: 0.9rem; font-weight: bold; color: #0f172a;">Jina: KEDESH LIMITED</span>
            </div>
            
            <button class="btn-primary mt-4 full-width" @click="showTopupModal = false">Sawa, Nimeelewa</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- MENU YA PEMBENI (SIDEBAR) -->
    <aside class="sidebar">
      <div class="brand">
        <img src="/logo/image.png" alt="Kedesh Limited" class="brand-logo" />
        <h2>{{ userData?.businessName || 'KEDESH LIMITED' }}</h2>
      </div>

      <div class="nav-menu">
        <p class="menu-label">MENU KUU</p>
        <button :class="['nav-btn', { active: currentView === 'home' }]" @click="currentView = 'home'">
          <span class="icon">📊</span> <span class="text">Muhtasari (Home)</span>
        </button>
        <button :class="['nav-btn', { active: currentView === 'bulk' }]" @click="currentView = 'bulk'">
          <span class="icon">🚀</span> <span class="text">Kituo cha Bulk SMS</span>
        </button>
        <button :class="['nav-btn', { active: currentView === 'chat' }]" @click="currentView = 'chat'">
          <span class="icon">💬</span> <span class="text">Live Chat (Wateja)</span>
          <span v-if="totalUnread > 0" class="global-unread-badge">{{ totalUnread }}</span>
        </button>
        
        <p class="menu-label mt-4">MIPANGILIO</p>
        <button :class="['nav-btn', { active: currentView === 'settings' }]" @click="currentView = 'settings'">
          <span class="icon">⚙️</span> <span class="text">API & Akaunti</span>
        </button>
      </div>

      <div class="sidebar-footer">
        <div class="wallet-card">
          <div class="wallet-header">
            <span class="wallet-icon">💳</span> <span>Salio Lako (TZS)</span>
          </div>
          <h3>{{ formatMoney(userData?.walletBalance) }}</h3>
          <button class="topup-btn" @click="showTopupModal = true">Weka Salio</button>
        </div>
        
        <div class="user-card">
          <div class="avatar">{{ userData?.businessName?.charAt(0).toUpperCase() || 'K' }}</div>
          <div class="user-info">
            <h4>{{ userData?.businessName || 'Biashara Yangu' }}</h4>
            <p>+{{ userData?.phone || 'Namba' }}</p>
          </div>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <!-- HEADER YA JUU -->
      <header class="topbar">
        <div class="page-title">
          <h1>{{ pageTitle }}</h1>
          <p class="date-text">{{ currentDate }}</p>
        </div>
        <div class="topbar-actions">
          
          <div class="status-badge" :class="isSocketConnected ? 'bg-success' : 'bg-warning'" style="margin-right: 10px;">
            <span class="pulse-dot" :class="isSocketConnected ? 'pulse-green' : 'pulse-orange'"></span> 
            <span>{{ isSocketConnected ? 'Live Sync ⚡' : 'Inaunganisha...' }}</span>
          </div>

          <div class="status-badge" :class="userData?.whatsappPhoneId ? 'bg-success' : 'bg-warning'">
            <span class="pulse-dot" :class="userData?.whatsappPhoneId ? 'pulse-green' : 'pulse-orange'"></span> 
            <span>{{ userData?.whatsappPhoneId ? 'API Imeunganishwa' : 'API Haijaunganishwa' }}</span>
          </div>
          <button @click="$emit('logout')" class="logout-btn" title="Toka Kwenye Mfumo">🚪 Toka Nje</button>
        </div>
      </header>

      <div class="content-area">
        <transition name="fade" mode="out-in">
          
          <!-- HOME VIEW (MUHTASARI) -->
          <div v-if="currentView === 'home'" key="home" class="view-panel">
            <div class="welcome-banner">
              <div class="banner-text">
                <h2>Karibu sana, {{ userData?.fullName?.split(' ')[0] || 'Kiongozi' }}! 👋</h2>
                <p>Huu ni mfumo wako wa kisasa wa kudhibiti mawasiliano ya WhatsApp. Tuma Bulk SMS na jibu wateja wako kwa urahisi na usalama wa hali ya juu.</p>
                <button class="btn-banner" @click="currentView = 'bulk'">🚀 Anza Kampeni Mpya</button>
              </div>
              <div class="banner-graphic">📈</div>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon bg-blue">📨</div>
                <div class="stat-data">
                  <h3 v-if="isLoadingStats"><span class="loader-small-dark"></span></h3>
                  <h3 v-else>{{ formatMoney(totalSent) }}</h3>
                  <p>SMS Zilizotumwa</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon bg-green">✅</div>
                <div class="stat-data">
                  <h3 v-if="isLoadingStats"><span class="loader-small-dark"></span></h3>
                  <h3 v-else>{{ formatMoney(totalDelivered) }}</h3>
                  <p>SMS Zilizofika (Soma)</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon bg-orange">👥</div>
                <div class="stat-data">
                  <h3 v-if="isLoadingStats"><span class="loader-small-dark"></span></h3>
                  <h3 v-else>{{ formatMoney(totalContacts) }}</h3>
                  <p>Jumla ya Wateja</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon bg-red">❌</div>
                <div class="stat-data">
                  <h3 v-if="isLoadingStats"><span class="loader-small-dark"></span></h3>
                  <h3 v-else>{{ formatMoney(totalFailed) }}</h3>
                  <p>SMS Zilizofeli</p>
                </div>
              </div>
            </div>
          </div>

          <!-- BULK SMS VIEW -->
          <div v-else-if="currentView === 'bulk'" key="bulk" class="view-panel">
             <div class="grid-layout">
                <div class="card form-card">
                  <h3>Tengeneza Kampeni Mpya</h3>
                  <p class="text-muted mb-4">Pakia faili la Excel (.xlsx au .csv) lenye namba za wateja wako.</p>
                  
                  <div v-if="!userData?.whatsappPhoneId" class="enc-alert bg-warning text-dark mb-3">
                    ⚠️ Hujaweka Namba yako ya WhatsApp API. Nenda kwenye "Mipangilio" kuiweka.
                  </div>

                  <div class="form-group"><label>Jina la Kampeni (Kwa Kumbukumbu)</label><input type="text" v-model="campaignName" class="form-control" placeholder="Mfano: Ofa ya Pasaka" :disabled="isSending" /></div>
                  
                  <div class="form-row mt-3">
                    <div class="form-group flex-1">
                      <label>Jina la Template (Kama ilivyo Meta)</label>
                      <input type="text" v-model="templateNameInput" class="form-control" placeholder="Mfano: weekend_ofa_ijumamosi" :disabled="isSending" />
                    </div>
                    <div class="form-group" style="width: 140px;">
                      <label>Lugha (Code)</label>
                      <input type="text" v-model="templateLanguage" class="form-control" placeholder="Mfano: sw au en_US" :disabled="isSending" />
                    </div>
                  </div>

                  <div class="form-group mt-3">
                    <label>Link ya Picha <span class="text-muted" style="font-weight: normal; font-size: 0.8rem;">(Weka link kama Template yako ina Picha kule Meta)</span></label>
                    <input type="text" v-model="headerImageUrl" class="form-control" placeholder="Mfano: https://mtandao.com/picha-yangu.jpg" :disabled="isSending" />
                  </div>

                  <div class="upload-zone mt-4" @dragover.prevent @drop.prevent="handleDrop" @click="!selectedFile && !isSending ? $refs.fileInput.click() : null" :class="{ 'has-file': selectedFile, 'disabled-zone': isSending }">
                    <input type="file" ref="fileInput" accept=".xlsx, .xls, .csv" style="display: none" @change="handleFileSelect" />
                    <div v-if="isExtracting"><span class="upload-icon loading-spin">⏳</span><h4 class="text-blue">Inasoma Excel yako...</h4></div>
                    <div v-else-if="!selectedFile"><span class="upload-icon">📊</span><h4>Vuta na udondoshe Excel hapa</h4><p>au bofya hapa kuchagua faili</p></div>
                    <div v-else class="file-ready"><span class="upload-icon text-green">✅</span><h4 class="text-green">{{ selectedFile.name }}</h4><p>Namba sahihi: <strong>{{ parsedContacts.length }}</strong></p><button class="btn-outline-danger mt-2" @click.stop="clearFile" :disabled="isSending">🗑️ Ondoa Faili</button></div>
                  </div>
                </div>

                <div class="card summary-card">
                   <h3>Muhtasari wa Kampeni</h3>
                   <div class="summary-details mt-3">
                     <div class="sum-row"><span>Kampeni:</span> <strong>{{ campaignName || 'Haijaandikwa' }}</strong></div>
                     <div class="sum-row"><span>Template:</span> <strong>{{ templateNameInput || 'hello_world' }}</strong></div>
                     <div class="sum-row"><span>Picha:</span> <strong>{{ headerImageUrl ? 'Ipo' : 'Hapana' }}</strong></div>
                     <div class="sum-row"><span>Wateja:</span> <strong>{{ parsedContacts.length }}</strong></div>
                     <div class="sum-row"><span>Gharama (TZS 84/SMS):</span> <strong class="text-red">TZS {{ formatMoney(parsedContacts.length * 84) }}</strong></div>
                     <div class="divider"></div>
                     <div class="sum-row"><span>Salio Lako:</span> <strong :class="userData?.walletBalance >= (parsedContacts.length * 84) ? 'text-green' : 'text-danger'">TZS {{ formatMoney(userData?.walletBalance) }}</strong></div>
                   </div>
                   
                   <button v-if="userData?.walletBalance < (parsedContacts.length * 84)" class="btn-primary full-width mt-4 bg-danger" disabled>
                     ⚠️ Salio Lako Halitoshi
                   </button>
                   <button v-else class="btn-primary full-width mt-4" :disabled="parsedContacts.length === 0 || isSending || !campaignName || !templateNameInput" @click="sendBulkSMS">
                     <span v-if="isSending" class="loader-small"></span><span v-else>🚀 Tuma SMS Sasa</span>
                   </button>

                   <transition name="fade">
                     <div v-if="sendReport" class="report-box mt-3" :class="sendReport.success ? 'bg-success-box' : 'bg-danger-box'">
                        <h4>Ripoti ya Kampeni:</h4><p v-if="!sendReport.success">{{ sendReport.message }}</p>
                        <div v-else>
                          <div class="stats-row"><span class="badge-success">✅ Zilizofika: {{ sendReport.successCount }}</span><span class="badge-danger">❌ Zilizofeli: {{ sendReport.failedCount }}</span></div>
                        </div>
                     </div>
                   </transition>
                </div>
             </div>
          </div>

          <!-- LIVE CHAT VIEW -->
          <div v-else-if="currentView === 'chat'" key="chat" class="view-panel chat-layout">
             <div class="chat-sidebar" :class="{'hide-on-mobile': activeChat !== null}">
               <div class="chat-header">
                 <h3>Inbox ya Wateja</h3>
                 <span class="new-chat-icon" title="Onyesha Wateja upya" @click="fetchContactsSilent">🔄</span>
               </div>
               <div class="chat-search">
                 <div class="search-wrap">
                   <span class="s-icon">🔍</span>
                   <input type="text" placeholder="Tafuta mteja..." v-model="searchQuery" />
                 </div>
               </div>
               
               <div class="chat-list custom-scrollbar">
                 <div v-if="filteredContacts.length === 0" class="empty-state" style="margin-top: 50px;">
                   <span class="icon">📭</span><p>Hakuna meseji.</p>
                 </div>
                 
                 <div v-else v-for="contact in filteredContacts" :key="contact.id" class="contact-item" :class="{ 'active-contact': activeChat === contact.id }" @click="openChat(contact)">
                   <div class="contact-avatar">{{ contact.name.charAt(0).toUpperCase() }}</div>
                   <div class="contact-info">
                     <div class="c-top">
                       <h4 class="c-name" :class="{'font-bold': contact.unread > 0}">{{ contact.name }}</h4>
                       <span class="c-time" :class="{'text-green font-bold': contact.unread > 0}">{{ contact.time }}</span>
                     </div>
                     <div class="c-bottom">
                       <p class="c-msg" :class="{'font-bold text-dark': contact.unread > 0}">
                         <span v-if="contact.lastSender === 'me'" class="msg-ticks list-ticks" :class="contact.lastStatus === 'READ' ? 'tick-blue' : 'tick-gray'">
                            <svg v-if="contact.lastStatus === 'PENDING' || contact.lastStatus === 'SENT' || contact.lastStatus === 'FAILED'" viewBox="0 0 16 15" width="14" height="14" fill="currentColor"><path d="M10.91 3.316l-4.203 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path></svg>
                            <svg v-if="contact.lastStatus === 'DELIVERED' || contact.lastStatus === 'READ'" viewBox="0 0 16 15" width="14" height="14" fill="currentColor"><path d="M15.01 3.316l-4.203 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path><path d="M10.3 3.316l-4.204 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z"></path></svg>
                         </span>
                         {{ contact.lastMsg }}
                       </p>
                       <span v-if="contact.unread > 0" class="unread-badge">{{ contact.unread }}</span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>

             <div class="chat-main" :class="{'show-on-mobile': activeChat !== null}" v-if="activeChat">
                <div class="active-chat-header">
                  <div class="active-profile">
                    <button class="back-btn-mobile" @click="activeChat = null">⬅️</button>
                    <div class="avatar">{{ currentActiveContact?.name?.charAt(0).toUpperCase() || 'U' }}</div>
                    <div class="details">
                      <h4>{{ currentActiveContact.name }}</h4>
                      <p>+{{ currentActiveContact.phone }}</p>
                    </div>
                  </div>
                  <div class="chat-actions">
                    <button class="icon-btn">🔍</button>
                    <button class="icon-btn">⋮</button>
                  </div>
                </div>

                <div class="chat-messages-area custom-scrollbar" ref="chatScroll">
                  <div class="date-divider"><span>Historia ya Meseji (Live Sync ⚡)</span></div>
                  
                  <div class="enc-alert bg-success text-dark" style="border: 1px solid #10b981;">
                    <span class="lock-icon-small">🛡️</span> Ujumbe unalindwa. Gharama ya Kujibu: <strong>TZS 30/SMS</strong>. (Ndani ya Masaa 24).
                  </div>

                  <div v-for="msg in chatMessages" :key="msg.id" 
                       class="message-row" :class="msg.direction === 'OUTBOUND' ? 'msg-out-row' : 'msg-in-row'">
                    <div class="message-bubble" :class="msg.direction === 'OUTBOUND' ? 'bubble-out' : 'bubble-in'">
                      <p class="msg-text">{{ msg.text }}</p>
                      <div class="msg-meta">
                        <span class="msg-time">{{ msg.time }}</span>
                        
                        <span v-if="msg.direction === 'OUTBOUND'" class="msg-ticks" :class="msg.status === 'READ' ? 'tick-blue' : 'tick-gray'">
                          <svg v-if="msg.status === 'PENDING'" viewBox="0 0 16 15" width="13" height="13" fill="currentColor"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/><polyline points="8 4 8 8 11 11" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
                          <svg v-if="msg.status === 'SENT' || msg.status === 'FAILED'" viewBox="0 0 16 15" width="15" height="15"><path d="M10.91 3.316l-4.203 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z" fill="currentColor"></path></svg>
                          <svg v-if="msg.status === 'DELIVERED' || msg.status === 'READ'" viewBox="0 0 16 15" width="15" height="15"><path d="M15.01 3.316l-4.203 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z" fill="currentColor"></path><path d="M10.3 3.316l-4.204 4.204-1.36-1.36a.996.996 0 0 0-1.408 0 .996.996 0 0 0 0 1.409l2.064 2.064a.996.996 0 0 0 1.408 0l4.908-4.908a.996.996 0 0 0 0-1.409.996.996 0 0 0-1.409 0z" fill="currentColor"></path></svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="chat-input-area">
                  <button class="chat-action-btn">😀</button>
                  <button class="chat-action-btn">📎</button>
                  <input type="text" v-model="newChatMessage" placeholder="Jibu mteja hapa (TZS 30)..." @keyup.enter="sendLiveMessage" :disabled="isSendingChat || userData?.walletBalance < 30" />
                  
                  <button v-if="userData?.walletBalance < 30" class="send-msg-btn bg-danger" disabled title="Salio Halitoshi">
                     <span style="font-size:10px; font-weight: bold; line-height: 1;">TZS</span>
                  </button>
                  <button v-else class="send-msg-btn" @click="sendLiveMessage" :disabled="!newChatMessage.trim() || isSendingChat">
                    <span v-if="isSendingChat" class="loader-small" style="width: 15px; height: 15px;"></span>
                    <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
                  </button>
                </div>
             </div>

             <div class="chat-main empty-mobile" v-else>
                <div class="empty-chat-view">
                  <div class="lock-circle">📱</div>
                  <h2>KEDESH SAAS Web</h2>
                  <p>Bofya jina la mteja upande wa kushoto kuanza kuchat naye. Meseji zote zinalindwa kwa usimbaji wa kimataifa (End-to-End Encrypted).</p>
                  <span class="secure-bottom">🔒 Imeunganishwa na Meta API & Database</span>
                </div>
             </div>
          </div>

          <!-- 🔥 MIPANGILIO YA AKAUNTI (AUTO-FETCHED WABA & PHONE ID) 🔥 -->
          <div v-else-if="currentView === 'settings'" key="settings" class="view-panel">
            <div class="card settings-card">
              <div class="settings-header text-center mb-4">
                 <div class="lock-icon" style="font-size: 3.5rem; margin-bottom: 10px;">🛡️</div>
                 <h3 style="font-size: 1.6rem; color: #0f172a; font-weight: 800;">Akaunti yako ya WhatsApp</h3>
                 <p class="text-muted">Taarifa zako za siri zinazolindwa na Mfumo wa Meta.</p>
              </div>
              
              <div v-if="userData?.whatsappPhoneId && userData?.wabaId" class="locked-box mt-4">
                 <span class="badge-live mb-3">Live & Connected ⚡</span>
                 
                 <div class="api-detail-group">
                    <span class="detail-label">Jina la Biashara</span>
                    <span class="detail-value text-blue">{{ userData.businessName }}</span>
                 </div>
                 
                 <div class="api-detail-group mt-3">
                    <span class="detail-label">WhatsApp Business Account (WABA ID)</span>
                    <span class="detail-value text-dark">{{ userData.wabaId }}</span>
                 </div>

                 <div class="api-detail-group mt-3">
                    <span class="detail-label">Phone Number ID</span>
                    <span class="detail-value text-dark" style="font-family: monospace; font-size: 1.2rem; letter-spacing: 2px;">{{ userData.whatsappPhoneId }}</span>
                 </div>

                 <div class="alert-box info mt-4 text-left" style="font-size: 0.85rem;">
                    <span class="a-icon">ℹ️</span> Namba hizi zimesomwa kiotomatiki kutoka kwenye akaunti yako ya Facebook ulipojiunga na mfumo. Zimefungwa kiusalama.
                 </div>
              </div>

              <!-- IKIWA MTEJA ALIRUKA SETUP YAKE YA WABA KULE FACEBOOK -->
              <div v-else class="locked-box bg-warning-light mt-4">
                 <div class="lock-icon text-warning">⚠️</div>
                 <h4 class="text-warning-dark">Setup Haijakamilika</h4>
                 <p class="text-left mt-3">
                    Inaonekana hukuweza kumaliza zoezi la kuunganisha namba yako ya WhatsApp kupitia dirisha la Facebook ulipokuwa unajisajili. <br><br>
                    Tafadhali <strong>Toka nje ya Mfumo (Logout)</strong> kisha ingia tena kwa kutumia kitufe cha "Endelea na Facebook" na ufuate maelekezo yote hadi mwisho.
                 </p>
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
  switch (currentView.value) {
    case 'home': return 'Muhtasari wa Biashara';
    case 'bulk': return 'Kituo cha Bulk SMS';
    case 'chat': return 'Live Chat (Wateja)';
    case 'settings': return 'Akaunti ya Meta';
    default: return 'Dashboard';
  }
});
const currentDate = computed(() => new Date().toLocaleDateString('sw-TZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
const formatMoney = (amount) => { return Number(amount || 0).toLocaleString(); };

// ==========================================
// 🚀 SOCKET.IO LOGIC 🚀
// ==========================================
let socket = null;
const isSocketConnected = ref(false);
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');

const initSocket = () => {
    const token = localStorage.getItem('msamba_token');
    if(!token) return;

    socket = io("https://kedesh-whatsapp-api.onrender.com", {
        auth: { token: token },
        transports: ['websocket', 'polling']
    });

    socket.on("connect", () => { isSocketConnected.value = true; });
    socket.on("disconnect", () => { isSocketConnected.value = false; });

    socket.on("newIncomingMessage", (data) => {
        const isMe = data.contactName === "You" || data.message.direction === 'OUTBOUND';
        if (!isMe) { notificationSound.play().catch(e => console.log("Browser imezuia sauti.")); }

        if (activeChat.value === data.contactId) {
            const exists = chatMessages.value.find(m => m.id === data.message.id || (m.text === data.message.content && m.status === 'PENDING'));
            
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
                axios.get(`https://kedesh-whatsapp-api.onrender.com/api/chat/messages/${data.contactId}`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                }).catch(e=>{});
            }
        }
        fetchContactsSilent();
    });

    socket.on("messageStatusUpdate", (data) => {
        const msg = chatMessages.value.find(m => m.metaMsgId === data.metaMsgId);
        if (msg) { msg.status = data.status; }
        const contact = chatContacts.value.find(c => c.id === activeChat.value);
        if(contact && contact.lastStatus !== 'READ') { contact.lastStatus = data.status; }
    });
};

const fetchContactsSilent = async () => {
  try {
    const token = localStorage.getItem('msamba_token');
    const res = await axios.get('https://kedesh-whatsapp-api.onrender.com/api/chat/contacts', { headers: { Authorization: `Bearer ${token}` } });
    if(res.data.success) { chatContacts.value = res.data.contacts.map(c => ({ ...c, time: formatTime(c.time) })); }
  } catch(e) {}
};

// ==========================================
// 📊 DASHBOARD & STATS LOGIC 
// ==========================================
const totalSent = ref(0); const totalDelivered = ref(0); const totalContacts = ref(0); const totalFailed = ref(0);
const isLoadingStats = ref(true);

const fetchDashboardStats = async () => {
  try {
      const token = localStorage.getItem('msamba_token');
      if(!token) return;
      const res = await axios.get('https://kedesh-whatsapp-api.onrender.com/api/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } });
      if(res.data.success) {
          totalSent.value = res.data.stats.totalSent || 0;
          totalDelivered.value = res.data.stats.totalDelivered || 0;
          totalContacts.value = res.data.stats.totalContacts || 0;
          totalFailed.value = res.data.stats.totalFailed || 0;
      }
  } catch(e) {}
  finally { isLoadingStats.value = false; }
};

const showTopupModal = ref(false);

// ======================= BULK SMS =======================
const fileInput = ref(null); const selectedFile = ref(null); const parsedContacts = ref([]);
const campaignName = ref(''); 
const templateNameInput = ref('weekend_ofa_ijumamosi'); 
const templateLanguage = ref('sw');
const headerImageUrl = ref(''); 

const isExtracting = ref(false); const isSending = ref(false); const sendReport = ref(null);

const handleFileSelect = (event) => { const file = event.target.files[0]; if (file) processExcel(file); };
const handleDrop = (event) => { const file = event.dataTransfer.files[0]; if (file) processExcel(file); };
const clearFile = () => { selectedFile.value = null; parsedContacts.value = []; sendReport.value = null; if (fileInput.value) fileInput.value.value = ''; };

const processExcel = (file) => {
  selectedFile.value = file; isExtracting.value = true; sendReport.value = null;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]; const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); 
      let numbersArray = [];
      jsonData.forEach((row) => {
         for (let cell of Object.values(row)) {
           if (cell) {
              let phone = String(cell).replace(/\D/g, ''); 
              if (phone.length >= 9) {
                  if (phone.startsWith('0')) phone = '255' + phone.substring(1);
                  else if (phone.length === 9) phone = '255' + phone;
                  if (phone.length >= 10 && phone.length <= 15 && phone.startsWith('255')) { numbersArray.push(phone); break; }
              }
           }
         }
      });
      parsedContacts.value = [...new Set(numbersArray)];
      if(parsedContacts.value.length === 0) { alert("Hakuna namba sahihi."); clearFile(); }
    } catch (error) { alert("Faili halisomeki vizuri."); clearFile(); } finally { isExtracting.value = false; }
  };
  reader.readAsArrayBuffer(file);
};

const sendBulkSMS = async () => {
   if (parsedContacts.value.length === 0 || !campaignName.value || !templateNameInput.value) return;
   
   const estimatedCost = parsedContacts.value.length * 84;
   if(userData.value.walletBalance < estimatedCost) {
      alert(`Salio lako halitoshi. Unahitaji TZS ${formatMoney(estimatedCost)}.`); return;
   }

   isSending.value = true; sendReport.value = null;
   try {
      const token = localStorage.getItem('msamba_token');
      const res = await axios.post('https://kedesh-whatsapp-api.onrender.com/api/send-bulk', { 
          contacts: parsedContacts.value, 
          campaignName: campaignName.value, 
          templateName: templateNameInput.value.trim(),
          templateLanguage: templateLanguage.value.trim(),
          headerImageUrl: headerImageUrl.value.trim() 
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data.success) {
         sendReport.value = { success: true, message: res.data.message, successCount: res.data.stats?.success, failedCount: res.data.stats?.failed };
         if(res.data.newBalance !== undefined) userData.value.walletBalance = res.data.newBalance;
         fetchDashboardStats(); 
         setTimeout(() => { clearFile(); campaignName.value = ''; headerImageUrl.value = ''; sendReport.value = null; }, 6000);
      }
   } catch (error) { 
      sendReport.value = { success: false, message: error.response?.data?.error || "Kosa la Kimtandao." }; 
   } finally { isSending.value = false; }
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

const currentActiveContact = computed(() => { return chatContacts.value.find(c => c.id === activeChat.value) || {}; });
const formatTime = (dateString) => { if (!dateString) return ''; return new Date(dateString).toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' }); };

const totalUnread = computed(() => { return chatContacts.value.reduce((sum, contact) => sum + contact.unread, 0); });
const filteredContacts = computed(() => {
  if (!searchQuery.value) return chatContacts.value;
  return chatContacts.value.filter(c => c.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || c.phone.includes(searchQuery.value));
});

const fetchContacts = async () => {
  try {
    const token = localStorage.getItem('msamba_token');
    if(!token) return;
    const res = await axios.get('https://kedesh-whatsapp-api.onrender.com/api/chat/contacts', { headers: { Authorization: `Bearer ${token}` } });
    if(res.data.success) { chatContacts.value = res.data.contacts.map(c => ({ ...c, time: formatTime(c.time) })); }
  } catch(e) {}
};

const fetchMessages = async (contactId) => {
  try {
    const token = localStorage.getItem('msamba_token');
    const res = await axios.get(`https://kedesh-whatsapp-api.onrender.com/api/chat/messages/${contactId}`, { headers: { Authorization: `Bearer ${token}` } });
    if(res.data.success) {
      const isFirstLoad = chatMessages.value.length === 0;
      chatMessages.value = res.data.messages.map(m => ({ 
          id: m.id, 
          metaMsgId: m.metaMsgId, 
          direction: m.direction, 
          text: m.content, 
          status: m.status, 
          time: formatTime(m.createdAt) 
      }));
      if(isFirstLoad) scrollToBottom();
    }
  } catch(e) {}
};

const openChat = (contact) => {
  activeChat.value = contact.id; contact.unread = 0; fetchMessages(contact.id); setTimeout(scrollToBottom, 300); 
};

const sendLiveMessage = async () => {
  if(userData.value.walletBalance < 30) { alert("⚠️ Salio lako halitoshi. Unahitaji TZS 30."); return; }
  if (!newChatMessage.value.trim() || isSendingChat.value || !activeChat.value) return;
  
  const textToSend = newChatMessage.value;
  newChatMessage.value = ''; isSendingChat.value = true;

  const tempId = Date.now();
  chatMessages.value.push({ id: tempId, metaMsgId: null, direction: 'OUTBOUND', text: textToSend, status: 'PENDING', time: new Date().toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' }) });
  scrollToBottom();

  try {
    const token = localStorage.getItem('msamba_token');
    const res = await axios.post('https://kedesh-whatsapp-api.onrender.com/api/chat/send', {
      contactId: activeChat.value, phone: currentActiveContact.value.phone, messageText: textToSend
    }, { headers: { Authorization: `Bearer ${token}` } });

    if(res.data.success && res.data.newBalance !== undefined) {
        userData.value.walletBalance = res.data.newBalance;
        fetchDashboardStats();
    }
    fetchMessages(activeChat.value); fetchContactsSilent();
  } catch (error) {
    chatMessages.value = chatMessages.value.filter(m => m.id !== tempId); 
    if(error.response?.status === 402) { alert("Salio lako limeisha."); }
    else if(error.response?.status === 403) { alert("Huna Phone ID, nenda kwenye Mipangilio."); }
    else if(error.response?.status === 400) { alert(error.response.data.error); }
    else { alert("Imeshindwa Kutuma."); }
  } finally { isSendingChat.value = false; }
};

const scrollToBottom = async () => { await nextTick(); if (chatScroll.value) { chatScroll.value.scrollTop = chatScroll.value.scrollHeight; } };

const startStatsPolling = () => { 
  fetchDashboardStats();
  statsPolling = setInterval(() => { 
    if(currentView.value === 'home') fetchDashboardStats(false);
  }, 15000); 
};

const stopStatsPolling = () => { if (statsPolling) { clearInterval(statsPolling); statsPolling = null; } };

watch(currentView, (newView) => { if(newView === 'chat') { fetchContacts(); } });

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
* { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
.dashboard-layout { display: flex; height: 100vh; width: 100vw; background: #f4f7f9; overflow: hidden; position: relative;}

/* ======== ZENO PAY MODAL ======== */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(5px);}
.modal-card { background: white; width: 90%; max-width: 450px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); overflow: hidden; animation: slideUp 0.3s ease-out;}
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal-header { background: #0f172a; color: white; padding: 20px 25px; display: flex; justify-content: space-between; align-items: center;}
.modal-header h3 { margin: 0; font-size: 1.1rem;}
.close-btn { background: none; border: none; color: white; font-size: 1.8rem; cursor: pointer;}
.modal-body { padding: 30px; }
.wallet-icon-large { font-size: 4rem; margin-bottom: 10px; }
.text-center { text-align: center; }
.contact-admin { background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px dashed #cbd5e1; display: inline-block; width: 100%;}
.text-blue { color: #3b82f6; font-weight: bold;}
.text-green { color: #10b981; }
.full-width { width: 100%; }

/* ======== SIDEBAR ======== */
.sidebar { width: 280px; background: #0b1121; color: white; display: flex; flex-direction: column; z-index: 10; }
.brand { display: flex; align-items: center; gap: 12px; padding: 25px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.brand-logo { height: 35px; } .brand h2 { font-size: 1.1rem; font-weight: 800; letter-spacing: 0.5px; }
.nav-menu { flex: 1; padding: 20px 15px; overflow-y: auto; }
.menu-label { font-size: 0.75rem; color: #64748b; font-weight: 700; margin-bottom: 10px; margin-left: 10px; letter-spacing: 1px; }
.nav-btn { position: relative; display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 15px; background: transparent; border: none; color: #94a3b8; font-size: 0.95rem; font-weight: 600; border-radius: 10px; cursor: pointer; transition: 0.3s; margin-bottom: 5px; text-align: left;}
.nav-btn:hover { background: rgba(255,255,255,0.05); color: white; }
.nav-btn.active { background: #4f46e5; color: white; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4); }
.global-unread-badge { position: absolute; right: 15px; background: #ef4444; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: bold;}
.sidebar-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.05); background: #0f172a;}
.wallet-card { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 15px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }
.wallet-header { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; opacity: 0.9; margin-bottom: 5px; }
.wallet-card h3 { font-size: 1.5rem; font-weight: 800; margin-bottom: 10px; transition: color 0.3s; }
.topup-btn { background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px; width: 100%; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.3s; }
.topup-btn:hover { background: white; color: #059669; }
.user-card { display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 10px; }
.avatar { width: 40px; height: 40px; background: #4f46e5; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 1.2rem; }
.user-info h4 { font-size: 0.9rem; margin-bottom: 2px;} .user-info p { font-size: 0.75rem; color: #94a3b8; }
.main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* TOPBAR NA BEJI MPYA YA API STATUS */
.topbar { height: 80px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; padding: 0 40px; }
.page-title h1 { font-size: 1.5rem; color: #0f172a; font-weight: 800; }
.date-text { font-size: 0.85rem; color: #64748b; margin-top: 4px; }
.topbar-actions { display: flex; align-items: center; gap: 20px; }
.status-badge { display: flex; align-items: center; gap: 8px; padding: 8px 15px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; border: 1px solid; }
.bg-success { background: #ecfdf5; color: #059669; border-color: #a7f3d0;}
.bg-warning { background: #fffbeb; color: #b45309; border-color: #fde68a;}
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; }
.pulse-green { background: #10b981; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); animation: pulseGreen 2s infinite; }
.pulse-orange { background: #f59e0b; box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); animation: pulseOrange 2s infinite; }
@keyframes pulseGreen { 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
@keyframes pulseOrange { 70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); } 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } }

.logout-btn { background: #fee2e2; color: #ef4444; border: none; padding: 10px 15px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.3s; }
.logout-btn:hover { background: #fca5a5; color: white;}
.content-area { flex: 1; padding: 40px; overflow-y: auto; }
.view-panel { height: 100%; }

/* ======== CSS YA BULK SMS & STATS ======== */
.welcome-banner { background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); border-radius: 20px; padding: 40px; color: white; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;}
.banner-text h2 { font-size: 1.8rem; font-weight: 800; margin-bottom: 10px; }
.btn-banner { background: white; color: #4f46e5; border: none; padding: 12px 25px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: 0.3s;}
.btn-banner:hover { transform: translateY(-2px); }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
.stat-card { background: white; padding: 25px; border-radius: 16px; display: flex; align-items: center; gap: 20px; border: 1px solid #e2e8f0; transition: transform 0.3s, box-shadow 0.3s; }
.stat-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
.stat-icon { width: 55px; height: 55px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
.bg-blue { background: #eff6ff; color: #3b82f6; } .bg-green { background: #f0fdf4; color: #10b981; } .bg-orange { background: #fff7ed; color: #ea580c; } .bg-red { background: #fef2f2; color: #ef4444; }
.stat-data h3 { font-size: 1.8rem; color: #0f172a; font-weight: 800; margin-bottom: 2px;} .stat-data p { font-size: 0.85rem; color: #64748b; font-weight: 600; margin-top: 2px;}
.loader-small-dark { display: inline-block; border: 3px solid rgba(15, 23, 42, 0.1); border-top: 3px solid #0f172a; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; }

.grid-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }
.card { background: white; padding: 30px; border-radius: 20px; border: 1px solid #e2e8f0; }
.form-group label { display: block; font-weight: 600; color: #334155; margin-bottom: 8px;}
.form-control { width: 100%; padding: 12px 15px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 1rem; outline: none; background: #f8fafc;}
.form-control:focus { border-color: #4f46e5; background: white;}
.form-control:disabled { background: #e2e8f0; cursor: not-allowed; color: #64748b; }
.form-row { display: flex; gap: 15px; }
.flex-1 { flex: 1; }

.upload-zone { border: 2px dashed #cbd5e1; border-radius: 16px; padding: 50px 20px; text-align: center; background: #f8fafc; cursor: pointer; transition: 0.3s;}
.upload-zone:hover { border-color: #4f46e5; }
.upload-zone.has-file { border: 2px solid #10b981; background: #ecfdf5; }
.btn-primary { display: flex; justify-content: center; align-items: center; background: #4f46e5; color: white; border: none; padding: 14px; border-radius: 10px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: 0.3s;}
.btn-primary:hover:not(:disabled) { background: #4338ca; transform: translateY(-2px);}
.btn-primary:disabled { background: #cbd5e1; cursor: not-allowed; transform: none;}
.bg-danger { background: #ef4444 !important; }

/* ======== CSS YA LIVE CHAT ======== */
.chat-layout { display: flex; background: white; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; height: calc(100vh - 160px); padding: 0; box-shadow: 0 10px 30px rgba(0,0,0,0.05);}
.chat-sidebar { width: 340px; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; background: #ffffff; }
.chat-header { padding: 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: space-between; align-items: center;}
.chat-header h3 { color: #0f172a; font-size: 1.15rem; font-weight: 700;}
.new-chat-icon { font-size: 1.2rem; cursor: pointer; color: #54656f; transition: 0.3s;}
.new-chat-icon:hover { transform: rotate(180deg); }
.chat-search { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; background: white;}
.search-wrap { display: flex; align-items: center; background: #f1f5f9; border-radius: 10px; padding: 8px 15px; }
.search-wrap .s-icon { font-size: 0.9rem; margin-right: 10px; opacity: 0.6; }
.search-wrap input { flex: 1; border: none; background: transparent; outline: none; font-size: 0.95rem; color: #334155;}
.chat-list { flex: 1; overflow-y: auto; background: #ffffff; }
.contact-item { display: flex; align-items: center; padding: 15px; cursor: pointer; border-bottom: 1px solid #f8fafc; transition: 0.2s;}
.contact-item:hover { background: #f8fafc; }
.active-contact { background: #f0f2f5 !important; border-left: 4px solid #10b981;}
.contact-avatar { width: 48px; height: 48px; background: linear-gradient(135deg, #cbd5e1, #94a3b8); color: white; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 1.2rem; font-weight: bold; margin-right: 15px; flex-shrink: 0;}
.active-contact .contact-avatar { background: linear-gradient(135deg, #4f46e5, #3730a3); }
.contact-info { flex: 1; overflow: hidden; }
.c-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
.c-name { font-size: 1rem; color: #0f172a; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
.c-time { font-size: 0.75rem; color: #64748b; font-weight: 600;}
.c-bottom { display: flex; justify-content: space-between; align-items: center;}
.c-msg { font-size: 0.9rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; margin: 0; padding-right: 10px;}
.font-bold { font-weight: 700; color: #0f172a; }
.unread-badge { background: #25D366; color: white; font-size: 0.75rem; font-weight: bold; padding: 2px 8px; border-radius: 12px; }

/* TIKI ZA WHATSAPP (UI COLOR) */
.list-ticks { margin-right: 5px; display: inline-flex; }
.tick-gray { color: #8696a0; }
.tick-blue { color: #53bdeb !important; }

.chat-main { flex: 1; display: flex; flex-direction: column; background: #efeae2; position: relative;}
.empty-chat-view { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px; background: #f0f2f5; }
.lock-circle { font-size: 3rem; background: white; width: 100px; height: 100px; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 20px auto; box-shadow: 0 4px 10px rgba(0,0,0,0.05);}
.empty-chat-view h2 { color: #41525d; font-weight: 300; margin-bottom: 15px; }
.empty-chat-view p { color: #667781; font-size: 0.95rem; max-width: 450px; line-height: 1.5; }
.secure-bottom { position: absolute; bottom: 40px; color: #8696a0; font-size: 0.8rem; }

.active-chat-header { height: 70px; background: #f0f2f5; padding: 0 25px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #d1d7db; z-index: 10;}
.active-profile { display: flex; align-items: center; gap: 12px;}
.active-profile .avatar { width: 42px; height: 42px; background: #94a3b8; border-radius: 50%; color: white; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 1.1rem;}
.details h4 { color: #111b21; font-size: 1.05rem; margin-bottom: 2px;}
.details p { color: #667781; font-size: 0.8rem; }
.chat-actions .icon-btn { background: none; border: none; font-size: 1.2rem; color: #54656f; cursor: pointer; padding: 8px; margin-left: 10px; border-radius: 50%;}
.chat-messages-area { flex: 1; padding: 30px 6%; overflow-y: auto; background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-size: contain; background-repeat: repeat; display: flex; flex-direction: column; gap: 6px; scroll-behavior: smooth;}

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 10px; }

.enc-alert { background: #ffeecd; color: #54656f; font-size: 0.8rem; text-align: center; padding: 8px 15px; border-radius: 10px; align-self: center; margin-bottom: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);}
.bg-success { background: #ecfdf5 !important; border: 1px solid #a7f3d0;}
.date-divider { text-align: center; margin: 15px 0; }
.date-divider span { background: #ffffff; color: #54656f; font-size: 0.8rem; padding: 6px 12px; border-radius: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); font-weight: 600;}

.message-row { display: flex; width: 100%; margin-bottom: 4px; }
.msg-out-row { justify-content: flex-end; }
.msg-in-row { justify-content: flex-start; }
.message-bubble { max-width: 65%; padding: 8px 10px 6px 12px; border-radius: 8px; position: relative; box-shadow: 0 1px 1px rgba(0,0,0,0.1); display: flex; flex-direction: column; min-width: 120px; }
.bubble-out { background: #d9fdd3; border-top-right-radius: 0; }
.bubble-in { background: #ffffff; border-top-left-radius: 0; }
.msg-text { font-size: 0.95rem; color: #111b21; line-height: 1.4; padding-bottom: 10px; word-wrap: break-word; margin: 0;}
.msg-meta { position: absolute; bottom: 4px; right: 8px; display: flex; align-items: center; gap: 4px; }
.msg-time { font-size: 0.65rem; color: #667781; }
.msg-ticks { display: flex; align-items: center; margin-top: -2px;}

.chat-input-area { background: #f0f2f5; padding: 12px 20px; display: flex; align-items: center; gap: 15px; border-top: 1px solid #d1d7db; border-bottom-right-radius: 20px; z-index: 10;}
.chat-action-btn { background: none; border: none; font-size: 1.5rem; color: #54656f; cursor: pointer;}
.chat-input-area input { flex: 1; padding: 12px 20px; border-radius: 24px; border: none; outline: none; font-size: 0.95rem; box-shadow: 0 1px 1px rgba(0,0,0,0.05); }
.send-msg-btn { background: #00a884; width: 45px; height: 45px; border-radius: 50%; border: none; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s; padding-right: 2px;}
.send-msg-btn:hover:not(:disabled) { background: #019071; }
.send-msg-btn:disabled { background: #94a3b8; cursor: not-allowed; }

.loader-small { display: inline-block; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; }

/* ======== CSS MPYA YA MIPANGILIO (SETTINGS) ======== */
.settings-card { max-width: 650px; margin: 0 auto; padding: 40px;}
.locked-box { border: 1px solid #e2e8f0; background: #ffffff; padding: 30px; border-radius: 16px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.03); }
.bg-warning-light { background: #fffbeb; border-color: #fde68a; }
.text-warning-dark { color: #b45309; }
.badge-live { display: inline-block; background: #ecfdf5; color: #059669; font-weight: 800; font-size: 0.85rem; padding: 6px 15px; border-radius: 20px; border: 1px solid #a7f3d0;}
.api-detail-group { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px 20px; border-radius: 12px; display: flex; flex-direction: column; align-items: flex-start; text-align: left; }
.detail-label { font-size: 0.8rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;}
.detail-value { font-size: 1.1rem; font-weight: 800;}
.alert-box.info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
.text-left { text-align: left; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }

/* ========================================================
   📱 RESPONSIVENESS MPYA YA SIMU & TABLET
   ======================================================== */
.back-btn-mobile { display: none; background: none; border: none; font-size: 1.5rem; margin-right: 10px; cursor: pointer; }

@media (max-width: 992px) {
  .dashboard-layout { flex-direction: column; overflow-y: auto; height: 100vh; }
  .sidebar { width: 100%; padding: 15px; border-bottom: 1px solid #1e293b; flex-direction: column;}
  .brand { border-bottom: none; padding: 0 0 15px 0; justify-content: center; }
  .nav-menu { display: flex; overflow-x: auto; gap: 10px; padding: 0; margin-bottom: 5px; flex-direction: row;}
  .menu-label { display: none; }
  .nav-btn { width: auto; white-space: nowrap; padding: 10px 15px; margin: 0; }
  .sidebar-footer { display: none; }
  
  .topbar { padding: 15px; height: auto; flex-direction: column; gap: 15px; align-items: flex-start; }
  .topbar-actions { flex-wrap: wrap; width: 100%; justify-content: flex-start; gap: 10px;}
  .status-badge { font-size: 0.75rem; padding: 6px 12px; }
  
  .content-area { padding: 15px; }
  .grid-layout { grid-template-columns: 1fr; }
  
  .chat-layout { flex-direction: column; height: 80vh; }
  .chat-sidebar.hide-on-mobile { display: none; }
  .chat-sidebar { width: 100%; height: 100%; border-right: none; }
  .chat-main { display: none; width: 100%; height: 100%; }
  .chat-main.show-on-mobile { display: flex; }
  .chat-main.empty-mobile { display: none; }
  
  .back-btn-mobile { display: block; }
  .message-bubble { max-width: 85%; }
  .settings-card { padding: 20px; }
}
</style>