<template>
  <transition name="page-fade" mode="out-in">
    
    <!-- DASHBOARD COMPONENT -->
    <Dashboard 
      v-if="isAuthenticated && !isRedirecting" 
      key="dashboard" 
      :user="currentUser" 
      @logout="logout" 
    />

    <!-- REDIRECTING SCREEN (PREMIUM LOADER) -->
    <div v-else-if="isRedirecting" key="redirect" class="redirect-screen">
      <div class="redirect-content">
        <div class="success-animation">
          <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
            <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
            <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
          </svg>
        </div>
        <h2 class="redirect-title">Umefanikiwa Kuingia!</h2>
        <p class="redirect-text">Tunaandaa Dashibodi yako ya KEDESH SAAS...</p>
        <div class="loader-bar-container">
          <div class="loader-progress"></div>
        </div>
        <div class="secure-badge-redirect">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Inalinda taarifa zako kwa usalama wa hali ya juu...
        </div>
      </div>
    </div>

    <!-- AUTHENTICATION SCREEN -->
    <div v-else key="auth" class="auth-container">
      
      <!-- BRAND SIDE (LEFT) -->
      <div class="brand-side">
        <div class="brand-bg-pattern"></div>
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>
        <div class="glow-orb orb-3"></div>
        
        <div class="brand-content">
          <div class="brand-top">
            <div class="premium-badge">
              <span class="badge-dot"></span>
              KEDESH Premium WhatsApp API
            </div>
            <img src="/logo/image.png" alt="Kedesh Limited" class="logo mt-4" />
          </div>
          
          <div class="brand-middle">
            <h1 class="hero-title">Kuza Biashara Yako Kwa Nguvu Ya <span class="gradient-text">WhatsApp</span>.</h1>
            <p class="subtitle">Fikia wateja wengi kwa haraka, toa huduma bora, na ukuze mauzo kupitia mfumo salama wa kimataifa unaotumika na biashara zaidi ya 10,000+.</p>
            
            <div class="stats-mini">
              <div class="stat-item">
                <span class="stat-number">10K+</span>
                <span class="stat-label">Wateja Wanaridhika</span>
              </div>
              <div class="stat-divider-vertical"></div>
              <div class="stat-item">
                <span class="stat-number">99.9%</span>
                <span class="stat-label">Uptime Imara</span>
              </div>
              <div class="stat-divider-vertical"></div>
              <div class="stat-item">
                <span class="stat-number">256-bit</span>
                <span class="stat-label">Ulinzi Mkali</span>
              </div>
            </div>
          </div>
          
          <div class="brand-bottom desktop-only">
            <p>&copy; 2026 KEDESH LIMITED. Haki Zote Zimehifadhiwa.</p>
            <div class="links">
              <a href="?privacy=true" @click.prevent="openPrivacy">Sera ya Faragha</a> 
              <span class="dot">•</span> 
              <a href="#">Vigezo & Masharti</a>
            </div>
          </div>
        </div>
      </div>

      <!-- FORM SIDE (RIGHT) -->
      <div class="form-side">
        <div class="form-wrapper" :class="{ 'wide-wrapper': showPrivacy }">
          <transition name="fade-slide" mode="out-in">
            
            <!-- PRIVACY POLICY VIEW -->
            <div v-if="showPrivacy" key="privacy" class="glass-card privacy-card">
              <div class="privacy-header">
                <div class="header-icon">🛡️</div>
                <h2>SERA YA FARAGHA (PRIVACY POLICY)</h2>
                <div class="privacy-meta">
                  <span class="badge">Kedesh Bulk SMS</span>
                  <span class="dot-separator hide-mobile">•</span>
                  <span class="date">Imesasishwa: 13 Julai 2026</span>
                </div>
              </div>
              
              <div class="privacy-content custom-scrollbar">
                <div class="p-section">
                  <h3>1. Utangulizi</h3>
                  <p>Kedesh Limited ("sisi", "yetu") inamiliki na kuendesha mfumo wa Kedesh Bulk SMS. Tunathamini faragha yako na tumejitolea kulinda taarifa zako binafsi na za kibiashara. Sera hii inaeleza jinsi tunavyokusanya, kutumia, na kulinda data zako unapotumia mfumo wetu kupitia Facebook Login na WhatsApp Business API.</p>
                </div>
                <!-- ... Maelezo mengine ya Privacy yapo hapa (Hayajabadilika) ... -->
                <div class="p-section">
                  <h3>6. Mawasiliano</h3>
                  <p>Kama una swali lolote, tafadhali wasiliana nasi kupitia:</p>
                  <div class="contact-box">
                    <div class="contact-item">
                      <span class="contact-icon">📧</span>
                      <div>
                        <strong>Barua pepe:</strong>
                        <p>info@kedeshlimited.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="action-buttons mt-4">
                <button @click="closePrivacy" class="btn-primary-custom w-100">
                  <span class="btn-icon">←</span> Nimeelewa, Rudi Kuingia
                </button>
              </div>
            </div>

            <!-- LOGIN VIEW (EMBEDDED SIGNUP ONLY) -->
            <div v-else key="login" class="glass-card premium-login-card">
              <div class="form-header">
                <div class="header-icon-wrapper">
                  <div class="header-icon">🚀</div>
                </div>
                <h2>Karibu KEDESH SMS</h2>
                <p>Tumeungana na Meta kurahisisha mawasiliano yako.</p>
              </div>
              
              <!-- ALERTS -->
              <transition name="slide-down">
                <div v-if="authError" class="alert-box error">
                  <span class="a-icon">❌</span>
                  <div>
                    <strong>Hitilafu Imetokea</strong>
                    <p>{{ authError }}</p>
                  </div>
                </div>
              </transition>
              <transition name="slide-down">
                <div v-if="authWarning" class="alert-box warning">
                  <span class="a-icon">⚡</span>
                  <div>
                    <strong>Tahadhari</strong>
                    <p>{{ authWarning }}</p>
                  </div>
                </div>
              </transition>

              <!-- 🔥 FACEBOOK EMBEDDED SIGNUP BUTTON 🔥 -->
              <div class="facebook-auth-section main-auth">
                <div class="meta-certified-badge mb-4">
                  <span class="badge-icon">🛡️</span> Meta Tech Provider Rasmi
                </div>
                
                <button @click="loginWithFacebook" type="button" class="btn-facebook-massive" :disabled="isLoading">
                  <span v-if="isLoading && isFacebookAuth" class="loader"></span>
                  <span v-else class="fb-content-large">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                      <path d="M12 2.04c-5.5 0-10 4.48-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.54-4.5-10.02-10-10.02Z"/>
                    </svg>
                    Endelea na Facebook
                  </span>
                </button>
                <p class="fb-hint-large mt-4">
                  Bofya kitufe hapo juu kuunganisha namba yako ya WhatsApp moja kwa moja bila kuhitaji kujaza fomu.
                </p>
              </div>

              <div class="switch-mode">
                <div class="mobile-privacy-link mt-4 text-center">
                  <a href="?privacy=true" @click.prevent="openPrivacy" class="m-link" style="justify-content: center;">
                    <span>🛡️</span> Soma Sera ya Faragha
                  </a>
                </div>
              </div>
            </div>

          </transition>
        </div>
      </div>
    </div>

  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import Dashboard from './components/Dashboard.vue'; 

const API_URL = 'https://apibulksms.kedeshlimited.com/api/auth';

const isAuthenticated = ref(false);
const isRedirecting = ref(false);
const currentUser = ref(null);
const isLoading = ref(false);
const isFacebookAuth = ref(false); 
const authError = ref('');
const authWarning = ref(''); 
const showPrivacy = ref(false);

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('privacy') === 'true' || window.location.hash.includes('privacy')) {
    showPrivacy.value = true;
  }
});

const openPrivacy = () => {
  showPrivacy.value = true;
  window.history.pushState({}, '', '?privacy=true');
};

const closePrivacy = () => {
  showPrivacy.value = false;
  window.history.pushState({}, '', window.location.pathname);
};

const loginWithFacebook = () => {
  isLoading.value = true;
  isFacebookAuth.value = true;
  authError.value = '';
  authWarning.value = '';

  if (!window.FB) {
    isLoading.value = false;
    isFacebookAuth.value = false;
    authError.value = "Mfumo wa Meta haujakamilika kufunguka. Tafadhali refresh ukurasa na ujaribu tena.";
    return;
  }

  window.FB.login((response) => {
    if (response.authResponse) {
      // Chukua 'code' moja kwa moja kwa sababu ndicho tulichoomba (response_type: 'code')
      const authCode = response.authResponse.code;
      
      if(authCode) {
        processFacebookAuth(authCode); 
      } else {
        // Fallback endapo atarudisha accessToken
        const accessToken = response.authResponse.accessToken;
        if(accessToken) {
            processFacebookAuth(accessToken);
        } else {
            isLoading.value = false;
            isFacebookAuth.value = false;
            authError.value = "Hakuna code iliyopokelewa kutoka Meta.";
        }
      }
    } else {
      isLoading.value = false;
      isFacebookAuth.value = false;
      authWarning.value = "Umesitisha zoezi la kuunganisha akaunti yako. Unaweza kujaribu tena unapokuwa tayari.";
    }
  }, {
    config_id: '1031132115961861', 
    response_type: 'code', // Imerekebishwa toka 'token,code' kuepuka ile error
    override_default_response_type: true,
    extras: {
      sessionInfoVersion: "3",
      version: "v4"
    }
  });
};

// Tunapokea data ambayo inaweza kuwa 'code' au 'accessToken' na kuituma DigitalOcean
const processFacebookAuth = async (authData) => {
  try {
    const res = await axios.post(`${API_URL}/facebook-login`, { 
        // Tunatuma data yoyote tuliyopata. Kama backend inategemea jina tofauti, irekebishe hapa.
        accessToken: authData, 
        authCode: authData 
    });
    
    if(res.data.success) {
      localStorage.setItem('msamba_token', res.data.token);
      currentUser.value = res.data.user; 
      
      isLoading.value = false;
      isFacebookAuth.value = false;
      isRedirecting.value = true; 
      
      setTimeout(() => {
        isRedirecting.value = false;
        isAuthenticated.value = true; 
      }, 2500);
    }
  } catch (error) {
    isLoading.value = false;
    isFacebookAuth.value = false;
    authError.value = error.response?.data?.error || "Kuna shida imejitokeza kuunganisha mfumo na Meta. Tafadhali jaribu tena.";
  }
};

const logout = () => { 
  isRedirecting.value = true;
  setTimeout(() => {
    isAuthenticated.value = false; 
    currentUser.value = null; 
    localStorage.removeItem('msamba_token');
    isRedirecting.value = false;
  }, 1000);
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

* { 
  margin: 0; 
  padding: 0; 
  box-sizing: border-box; 
  font-family: 'Plus Jakarta Sans', sans-serif; 
}

/* ======== REDIRECT SCREEN ======== */
.redirect-screen { 
  display: flex; 
  height: 100vh; 
  width: 100%;
  background: linear-gradient(135deg, #020617 0%, #1e1b4b 100%); 
  justify-content: center; 
  align-items: center; 
  color: white;
}

.redirect-content { display: flex; flex-direction: column; align-items: center; text-align: center; max-width: 450px; padding: 20px; }
.success-animation { margin-bottom: 24px; }
.checkmark { width: 80px; height: 80px; border-radius: 50%; display: block; stroke-width: 3; stroke: #10b981; stroke-miterlimit: 10; animation: scaleCheck 0.5s ease-in-out 0.3s both; }
.checkmark-circle { stroke-dasharray: 166; stroke-dashoffset: 166; stroke-width: 3; stroke: #10b981; fill: none; animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards; }
.checkmark-check { transform-origin: 50% 50%; stroke-dasharray: 48; stroke-dashoffset: 48; animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards; }

@keyframes stroke { 100% { stroke-dashoffset: 0; } }
@keyframes scaleCheck { 0% { transform: scale(0); } 100% { transform: scale(1); } }

.redirect-title { font-size: 2.4rem; font-weight: 800; color: #f8fafc; margin-bottom: 10px; letter-spacing: -0.5px; }
.redirect-text { color: #94a3b8; font-size: 1.15rem; margin-bottom: 35px; }

.loader-bar-container { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 10px; margin: 0 auto 20px auto; overflow: hidden; }
.loader-progress { height: 100%; background: linear-gradient(90deg, #4f46e5, #10b981, #4f46e5); background-size: 200% 100%; width: 0%; border-radius: 10px; animation: loadBar 2.5s ease-in-out forwards, shimmer 2s infinite; }
@keyframes loadBar { 0% { width: 0%; } 100% { width: 100%; } }
@keyframes shimmer { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }

.secure-badge-redirect { display: flex; align-items: center; gap: 10px; color: #10b981; font-size: 0.9rem; font-weight: 700; background: rgba(16, 185, 129, 0.1); padding: 12px 24px; border-radius: 30px; border: 1px solid rgba(16, 185, 129, 0.2); }

.page-fade-enter-active, .page-fade-leave-active { transition: opacity 0.5s ease, transform 0.5s ease; }
.page-fade-enter-from { opacity: 0; transform: scale(0.98); }
.page-fade-leave-to { opacity: 0; transform: scale(1.02); }

/* ======== MAIN AUTH LAYOUT ======== */
.auth-container { 
  display: flex; 
  min-height: 100vh; 
  width: 100%; 
  background: #f0f4f8; 
  overflow-x: hidden; 
}

/* ======== BRAND SIDE ======== */
.brand-side { flex: 1; background: linear-gradient(135deg, #020617 0%, #1e1b4b 100%); color: white; padding: 4rem; position: relative; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
.brand-bg-pattern { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(circle at 20% 80%, rgba(79, 70, 229, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.06) 0%, transparent 50%); z-index: 1; }
.glow-orb { position: absolute; border-radius: 50%; filter: blur(120px); z-index: 1; opacity: 0.4; animation: float 12s ease-in-out infinite alternate; }
.orb-1 { width: 450px; height: 450px; background: #4f46e5; top: -120px; left: -100px; }
.orb-2 { width: 350px; height: 350px; background: #10b981; bottom: -80px; right: -60px; animation-delay: 4s; }
.orb-3 { width: 250px; height: 250px; background: #ec4899; top: 45%; left: 35%; opacity: 0.15; animation-delay: 6s; }

@keyframes float { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(35px, 35px) scale(1.08); } }

.brand-content { z-index: 10; display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 500px; }
.brand-top .logo { height: 60px; object-fit: contain; margin-top: 1rem; }
.premium-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 18px; border-radius: 30px; font-size: 0.85rem; font-weight: 700; color: #e0e7ff; backdrop-filter: blur(10px); }
.badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }
.hero-title { font-size: 3.4rem; font-weight: 800; line-height: 1.15; margin-top: 1.5rem; margin-bottom: 1.5rem; letter-spacing: -1.5px; }
.gradient-text { background: linear-gradient(135deg, #4f46e5, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.subtitle { font-size: 1.15rem; color: #cbd5e1; line-height: 1.7; margin-bottom: 2.5rem; max-width: 90%; }
.stats-mini { display: flex; align-items: center; gap: 20px; margin-top: 2rem; }
.stat-item { display: flex; flex-direction: column; gap: 4px; }
.stat-number { font-size: 1.5rem; font-weight: 800; color: #f8fafc; }
.stat-label { font-size: 0.8rem; color: #94a3b8; font-weight: 500; }
.stat-divider-vertical { width: 1px; height: 40px; background: rgba(255, 255, 255, 0.15); }

.brand-bottom { display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px; }
.links a { color: #94a3b8; text-decoration: none; transition: 0.3s; font-weight: 600; }
.links a:hover { color: white; text-decoration: underline; }
.dot { margin: 0 10px; opacity: 0.5; }

/* ======== FORM SIDE ======== */
.form-side { flex: 1.3; display: flex; align-items: center; justify-content: center; background: #ffffff; padding: 2rem; position: relative; }
.form-wrapper { width: 100%; max-width: 460px; transition: max-width 0.4s ease; margin: 0 auto; } 
.wide-wrapper { max-width: 750px; } 

.glass-card { background: white; padding: 3rem 2.5rem; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08); border: 1px solid rgba(226, 232, 240, 0.8); width: 100%; transition: all 0.3s ease; }
.premium-login-card { padding: 4rem 3rem; text-align: center; }

.form-header { text-align: center; margin-bottom: 2.5rem; }
.header-icon-wrapper { margin-bottom: 12px; }
.header-icon { font-size: 3.5rem; display: inline-block; animation: wave 2.5s infinite; transform-origin: 70% 70%; }
@keyframes wave { 0% { transform: rotate(0deg); } 10% { transform: rotate(14deg); } 20% { transform: rotate(-8deg); } 30% { transform: rotate(14deg); } 40% { transform: rotate(-4deg); } 50% { transform: rotate(10deg); } 60%, 100% { transform: rotate(0deg); } }
.form-header h2 { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
.form-header p { color: #64748b; font-size: 1.05rem; }

/* 🔥 PREMIUM FACEBOOK BUTTON STYLES 🔥 */
.facebook-auth-section { margin-bottom: 1.5rem; width: 100%; display: flex; flex-direction: column; align-items: center;}
.meta-certified-badge { display: inline-flex; align-items: center; gap: 8px; background: #f0fdf4; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; border: 1px solid #bbf7d0; }
.btn-facebook-massive { width: 100%; background: #1877F2; color: white; padding: 20px; border-radius: 16px; border: none; font-size: 1.2rem; font-weight: 800; cursor: pointer; box-shadow: 0 10px 25px rgba(24, 119, 242, 0.4); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; justify-content: center; align-items: center; position: relative; overflow: hidden; }
.btn-facebook-massive::after { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(rgba(255,255,255,0.2), transparent, transparent); transform: rotate(45deg); animation: shimmerBtn 3s infinite; }
@keyframes shimmerBtn { 0% { transform: translateX(-100%) rotate(45deg); } 100% { transform: translateX(100%) rotate(45deg); } }
.btn-facebook-massive:hover:not(:disabled) { transform: translateY(-4px); box-shadow: 0 15px 35px rgba(24, 119, 242, 0.5); background: #166fe5; }
.btn-facebook-massive:active:not(:disabled) { transform: translateY(0); box-shadow: 0 5px 15px rgba(24, 119, 242, 0.4); }
.btn-facebook-massive:disabled { opacity: 0.7; cursor: not-allowed; }
.fb-content-large { display: flex; align-items: center; gap: 12px; z-index: 2; position: relative;}
.fb-hint-large { text-align: center; font-size: 0.95rem; color: #64748b; margin-top: 15px; font-weight: 500; line-height: 1.5; }

/* ======== ALERTS ======== */
.alert-box { padding: 16px; border-radius: 12px; margin-bottom: 20px; font-size: 0.9rem; font-weight: 500; display: flex; align-items: flex-start; gap: 12px; text-align: left; }
.alert-box .a-icon { font-size: 1.3rem; flex-shrink: 0; margin-top: 2px;}
.alert-box strong { display: block; font-weight: 700; margin-bottom: 2px;}
.alert-box p { margin: 0; font-weight: 400;}
.success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; } 

/* ======== PRIVACY CARD ======== */
.privacy-card { padding: 2.5rem 3rem !important; display: flex; flex-direction: column; max-height: 85vh; }
.privacy-header { border-bottom: 1px solid #e2e8f0; padding-bottom: 1.5rem; margin-bottom: 1.5rem; text-align: center; flex-shrink: 0; }
.privacy-header h2 { font-size: 1.6rem; color: #0f172a; font-weight: 800; margin: 10px 0 5px 0; }
.privacy-meta { display: flex; justify-content: center; align-items: center; gap: 10px; font-size: 0.85rem; color: #64748b; flex-wrap: wrap; }
.badge { background: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.8rem; }
.dot-separator { color: #cbd5e1; }
.privacy-content { overflow-y: auto; padding-right: 15px; text-align: left; }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px;}
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.p-section { margin-bottom: 1.8rem; }
.p-section h3 { font-size: 1.1rem; color: #0f172a; margin-bottom: 10px; font-weight: 800; }
.p-section p, .p-section ul { font-size: 0.95rem; color: #475569; line-height: 1.7; margin-bottom: 10px;}
.p-section ul { padding-left: 20px; }
.p-section li { margin-bottom: 8px; }
.contact-box { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px dashed #cbd5e1; margin-top: 10px; display: flex; flex-direction: column; gap: 15px; }
.contact-item { display: flex; align-items: flex-start; gap: 12px; }
.contact-icon { font-size: 1.3rem; flex-shrink: 0; margin-top: 2px; }
.contact-item strong { display: block; color: #0f172a; margin-bottom: 2px; }
.contact-item p { margin: 0; color: #64748b; }
.btn-primary-custom { width: 100%; background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: white; padding: 18px; border-radius: 12px; border: none; font-weight: 700; font-size: 1.05rem; cursor: pointer; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3); transition: all 0.3s ease; }
.btn-primary-custom:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4); }
.loader { border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; width: 26px; height: 26px; animation: spin 1s linear infinite; z-index: 2; position: relative;}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* ======== TRANSITIONS ======== */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-enter-from { opacity: 0; transform: scale(0.95) translateY(20px); }
.fade-slide-leave-to { opacity: 0; transform: scale(1.05) translateY(-20px); }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-15px); }

/* ======== MOBILE PRIVACY LINK ======== */
.mobile-privacy-link { margin-top: 15px; font-size: 0.95rem; }
.mobile-privacy-link a { color: #4f46e5; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
.mobile-privacy-link a:hover { text-decoration: underline; }

/* ======== 100% RESPONSIVENESS MEDIA QUERIES ======== */

/* Kompyuta za kati na Laptops */
@media (max-width: 1200px) {
  .hero-title { font-size: 2.8rem; }
  .brand-side { padding: 3rem; }
  .form-side { padding: 1.5rem; }
}

/* Tablets (iPad) na Laptops ndogo */
@media (max-width: 992px) {
  .auth-container { flex-direction: column; height: auto; min-height: 100vh; overflow-y: auto; }
  .brand-side { 
    padding: 3rem 1.5rem 2rem; 
    flex: none; 
    text-align: center; 
    align-items: center; 
  }
  .brand-content { min-height: auto; justify-content: center; gap: 1.5rem; }
  .brand-top .logo { margin: 0 auto 1rem; }
  
  .glow-orb { filter: blur(80px); }
  .orb-1 { width: 300px; height: 300px; top: -50px; left: -50px; }
  .orb-2 { width: 200px; height: 200px; bottom: 0; right: 0; }
  
  .desktop-only { display: none; } 
  .hero-title { font-size: 2.4rem; margin-top: 1rem; }
  .subtitle { max-width: 100%; font-size: 1.05rem; margin-bottom: 1.5rem; }
  .stats-mini { justify-content: center; }
  
  .form-side { padding: 1rem 1rem 3rem; align-items: flex-start; }
  .glass-card { max-width: 500px; margin: 0 auto; width: 100%; padding: 2.5rem 2rem; }
  .premium-login-card { padding: 3rem 2rem; }
  .privacy-card { padding: 1.5rem !important; max-height: none; } 
  .wide-wrapper { max-width: 100%; }
}

/* Simu Kubwa na Tablets ndogo */
@media (max-width: 768px) {
  .hero-title { font-size: 2rem; }
  .stats-mini { gap: 15px; }
}

/* Simu za Kawaida (Mobile) */
@media (max-width: 576px) {
  .hero-title { font-size: 1.8rem; }
  .subtitle { font-size: 0.95rem; }
  
  .stats-mini { flex-wrap: wrap; gap: 10px; }
  .stat-item { width: 45%; } 
  .stat-divider-vertical { display: none; } 
  
  .glass-card { padding: 2rem 1.2rem; border-radius: 16px; }
  .premium-login-card { padding: 2.5rem 1.2rem; }
  .form-header h2 { font-size: 1.6rem; }
  
  .btn-facebook-massive { font-size: 1.05rem; padding: 16px; border-radius: 12px; }
  .fb-content-large svg { width: 24px; height: 24px; }
  .fb-hint-large { font-size: 0.85rem; }
  
  .privacy-card { padding: 1.2rem !important; }
}
</style>