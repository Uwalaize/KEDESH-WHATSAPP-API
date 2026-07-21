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

    <!-- AUTHENTICATION (LOGIN/REGISTER) SCREEN -->
    <div v-else key="auth" class="auth-container">
      
      <!-- BRAND SIDE (LEFT) - IMEBOreshWA KWA UI MPYA -->
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
                <div class="p-section">
                  <h3>2. Taarifa Tunazokusanya</h3>
                  <p>Tunakusanya taarifa zifuatazo unapojisajili au kutumia mfumo wetu:</p>
                  <ul>
                    <li><strong>Taarifa za Biashara:</strong> Jina la biashara, jina la mmiliki, namba ya simu ya WhatsApp.</li>
                    <li><strong>Taarifa za Meta:</strong> Facebook ID, WhatsApp Business Account ID (WABA), Phone Number ID kupitia Facebook Login.</li>
                    <li><strong>Data za Ujumbe:</strong> Metadata za ujumbe (status, timestamp) kwa ajili ya kuripoti. <strong>HATUSOMI wala kuhifadhi maudhui ya meseji za wateja wako.</strong></li>
                  </ul>
                </div>
                <div class="p-section">
                  <h3>3. Jinsi Tunavyotumia Data Zako</h3>
                  <p>Data zako zinatumika kwa madhumuni yafuatayo pekee:</p>
                  <ul>
                    <li>Kukuwezesha kutuma na kupokea ujumbe wa WhatsApp kupitia mfumo wetu.</li>
                    <li>Kukupa takwimu na ripoti za utendaji wa kampeni zako.</li>
                    <li>Kusimamia akaunti yako na salio lako la wallet.</li>
                    <li>Kuwasiliana nawe kuhusu masasisho ya mfumo au masuala ya kiufundi.</li>
                  </ul>
                </div>
                <div class="p-section">
                  <h3>4. Ulinzi wa Data</h3>
                  <p>Tunatumia viwango vya juu vya usalama ikiwemo:</p>
                  <ul>
                    <li>Encryption ya 256-bit SSL/TLS kwa data zote zinazosafirishwa.</li>
                    <li>Access tokens zimehifadhiwa kwa usimbaji fiche (hashing).</li>
                    <li>Vikomo vya ufikiaji (rate limiting) kuzuia mashambulizi.</li>
                    <li>Uhifadhi wa data kwenye seva salama zilizo na ulinzi wa kimwili na kidigitali.</li>
                  </ul>
                </div>
                <div class="p-section">
                  <h3>5. Haki Zako</h3>
                  <p>Kama mtumiaji, una haki zifuatazo:</p>
                  <ul>
                    <li>Kufikia taarifa zako zote tulizohifadhi.</li>
                    <li>Kuomba kufuta au kusahihisha data zako.</li>
                    <li>Kuacha kutumia huduma yetu wakati wowote.</li>
                  </ul>
                </div>
                <div class="p-section">
                  <h3>6. Mawasiliano</h3>
                  <p>Kama una swali lolote, changamoto, au unahitaji msaada kuhusu Sera hii ya Faragha au ulinzi wa data zako, tafadhali wasiliana nasi kupitia:</p>
                  <div class="contact-box">
                    <div class="contact-item">
                      <span class="contact-icon">📧</span>
                      <div>
                        <strong>Barua pepe:</strong>
                        <p>info@kedeshlimited.com</p>
                      </div>
                    </div>
                    <div class="contact-item">
                      <span class="contact-icon">🌐</span>
                      <div>
                        <strong>Tovuti:</strong>
                        <p>www.kedeshlimited.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="action-buttons mt-4">
                <button @click="closePrivacy" class="btn-primary w-100">
                  <span class="btn-icon">←</span> Nimeelewa, Rudi Kuingia
                </button>
              </div>
            </div>

            <!-- LOGIN VIEW -->
            <div v-else-if="isLogin" key="login" class="glass-card">
              <div class="form-header">
                <div class="header-icon-wrapper">
                  <div class="header-icon">👋</div>
                </div>
                <h2>Karibu Tena</h2>
                <p>Unganisha biashara yako kupitia Meta au ingia na namba yako.</p>
              </div>
              
              <!-- ALERTS -->
              <transition name="slide-down">
                <div v-if="justRegistered" class="alert-box success">
                  <span class="a-icon">✅</span>
                  <div>
                    <strong>Usajili Umekamilika!</strong>
                    <p>Ingia kwenye mfumo sasa kuanza kutuma SMS.</p>
                  </div>
                </div>
              </transition>
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

              <!-- 🔥 FACEBOOK LOGIN BUTTON (IMEBORESHW A - HAKUNA EMBEDDED SIGNUP) 🔥 -->
              <div class="facebook-auth-section">
                <button @click="loginWithFacebook" type="button" class="btn-facebook" :disabled="isLoading">
                  <span v-if="isLoading && isFacebookAuth" class="loader"></span>
                  <span v-else class="fb-content">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M12 2.04c-5.5 0-10 4.48-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.54-4.5-10.02-10-10.02Z"/>
                    </svg>
                    Endelea na Facebook
                  </span>
                </button>
                <p class="fb-hint">Unganisha akaunti yako ya Meta Business kwa sekunde chache</p>
                
                <div class="divider">
                  <span>AU INGIA KWA NAMBA</span>
                </div>
              </div>

              <!-- MANUAL LOGIN FORM -->
              <form @submit.prevent="handleLogin" class="auth-form">
                <div class="input-group">
                  <label>Namba ya Simu (WhatsApp)</label>
                  <div class="modern-input-wrapper" :class="{ 'is-focused': phoneFocused }">
                    <select v-model="loginForm.countryCode" class="country-select" @focus="phoneFocused = true" @blur="phoneFocused = false">
                      <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.flag }} +{{ c.code }}</option>
                    </select>
                    <div class="input-divider"></div>
                    <input type="tel" v-model="loginForm.phone" class="modern-input" placeholder="712 345 678" required @focus="phoneFocused = true" @blur="phoneFocused = false"/>
                  </div>
                </div>
                
                <div class="input-group mt-4">
                  <div class="label-row">
                    <label>Nenosiri Lako</label>
                    <a href="#" class="forgot-link" @click.prevent="authWarning = 'Tafadhali wasiliana na admin kupitia info@kedeshlimited.com kurejesha nenosiri lako.'">Umesahau?</a>
                  </div>
                  <div class="modern-input-wrapper" :class="{ 'is-focused': passFocused }">
                    <span class="input-icon">🔑</span>
                    <input :type="showLoginPass ? 'text' : 'password'" v-model="loginForm.password" class="modern-input" placeholder="••••••••" required @focus="passFocused = true" @blur="passFocused = false"/>
                    <button type="button" class="toggle-pass-btn" @click="showLoginPass = !showLoginPass">
                      {{ showLoginPass ? '🙈' : '👁️' }}
                    </button>
                  </div>
                </div>
                
                <button type="submit" class="btn-primary mt-5" :disabled="isLoading">
                  <span v-if="isLoading && !isFacebookAuth" class="loader"></span>
                  <span v-else>Ingia Kwenye Akaunti <span class="btn-arrow">→</span></span>
                </button>
              </form>

              <div class="switch-mode">
                <p>Huna akaunti ya biashara?</p>
                <button @click="toggleMode" class="btn-text-outline">🚀 Fungua Akaunti Yako Bila Malipo</button>
                
                <div class="mobile-privacy-link mt-4">
                  <a href="?privacy=true" @click.prevent="openPrivacy" class="m-link">
                    <span>🛡️</span> Soma Sera ya Faragha
                  </a>
                </div>
              </div>
            </div>

            <!-- REGISTER VIEW -->
            <div v-else key="register" class="glass-card">
              <div class="form-header">
                <div class="header-icon-wrapper">
                  <div class="header-icon">🚀</div>
                </div>
                <h2>Fungua Akaunti Mpya</h2>
                <p>Hatua ya <strong>{{ step }}</strong> kati ya 3 • Inachukua chini ya dakika 1</p>
              </div>
              
              <div class="stepper">
                <div class="step-fill" :style="{ width: (step / 3) * 100 + '%' }"></div>
                <div class="step-dots">
                  <span v-for="i in 3" :key="i" class="step-dot" :class="{ active: i <= step, completed: i < step }"></span>
                </div>
              </div>
              
              <transition name="slide-down">
                <div v-if="authError" class="alert-box error">
                  <span class="a-icon">❌</span>
                  <div>
                    <strong>Hitilafu</strong>
                    <p>{{ authError }}</p>
                  </div>
                </div>
              </transition>

              <form @submit.prevent="nextStep" class="auth-form">
                <transition name="slide-left" mode="out-in">
                  
                  <div v-if="step === 1" key="step1">
                    <div class="step-title">
                      <span class="step-icon">🏢</span> Taarifa za Biashara
                    </div>
                    <div class="input-group">
                      <label>Jina la Biashara / Kampuni</label>
                      <div class="modern-input-wrapper" :class="{ 'is-focused': bizFocused }">
                        <span class="input-icon">🏢</span>
                        <input type="text" v-model="regForm.businessName" class="modern-input" placeholder="Mfano: KEDESH LIMITED" required @focus="bizFocused = true" @blur="bizFocused = false"/>
                      </div>
                    </div>
                    <div class="input-group mt-3">
                      <label>Jina Kamili la Mmiliki</label>
                      <div class="modern-input-wrapper" :class="{ 'is-focused': nameFocused }">
                        <span class="input-icon">👤</span>
                        <input type="text" v-model="regForm.fullName" class="modern-input" placeholder="Mfano: John Emmanuel" required @focus="nameFocused = true" @blur="nameFocused = false"/>
                      </div>
                    </div>
                    <div class="input-group mt-3">
                      <label>Namba ya Simu (WhatsApp)</label>
                      <div class="modern-input-wrapper" :class="{ 'is-focused': regPhoneFocused }">
                        <select v-model="regForm.countryCode" class="country-select" @focus="regPhoneFocused = true" @blur="regPhoneFocused = false">
                          <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.flag }} +{{ c.code }}</option>
                        </select>
                        <div class="input-divider"></div>
                        <input type="tel" v-model="regForm.phone" class="modern-input" placeholder="712 345 678" required @focus="regPhoneFocused = true" @blur="regPhoneFocused = false"/>
                      </div>
                    </div>
                  </div>

                  <div v-else-if="step === 2" key="step2">
                    <div class="step-title">
                      <span class="step-icon">🔒</span> Weka Nenosiri Salama
                    </div>
                    <div class="alert-box info mb-4">
                      <span class="a-icon">💡</span>
                      <div>
                        <strong>Ushauri:</strong>
                        <p>Tumia mchanganyiko wa herufi kubwa, ndogo, namba na alama kwa usalama zaidi.</p>
                      </div>
                    </div>
                    <div class="input-group">
                      <label>Nenosiri Jipya</label>
                      <div class="modern-input-wrapper" :class="{ 'is-focused': regPassFocused, 'is-error': passError }">
                        <span class="input-icon">🔒</span>
                        <input :type="showRegPass ? 'text' : 'password'" v-model="regForm.password" class="modern-input" placeholder="Angalau herufi 6" minlength="6" required @focus="regPassFocused = true" @blur="regPassFocused = false"/>
                        <button type="button" class="toggle-pass-btn" @click="showRegPass = !showRegPass">
                          {{ showRegPass ? '🙈' : '👁️' }}
                        </button>
                      </div>
                      <div class="password-strength" v-if="regForm.password">
                        <div class="strength-bar">
                          <div class="strength-fill" :class="passwordStrengthClass" :style="{ width: passwordStrengthPercent + '%' }"></div>
                        </div>
                        <span class="strength-text" :class="passwordStrengthClass">Nguvu: {{ passwordStrengthLabel }}</span>
                      </div>
                    </div>
                    <div class="input-group mt-3">
                      <label>Thibitisha Nenosiri</label>
                      <div class="modern-input-wrapper" :class="{ 'is-focused': confPassFocused, 'is-error': passError }">
                        <span class="input-icon">🛡️</span>
                        <input :type="showConfPass ? 'text' : 'password'" v-model="regForm.confirmPassword" class="modern-input" placeholder="Rudia nenosiri hapa" required minlength="6" @focus="confPassFocused = true" @blur="confPassFocused = false"/>
                        <button type="button" class="toggle-pass-btn" @click="showConfPass = !showConfPass">
                          {{ showConfPass ? '🙈' : '👁️' }}
                        </button>
                      </div>
                      <span v-if="passError" class="error-msg">⚠️ Manenosiri uliyoweka hayafanani!</span>
                    </div>
                  </div>

                  <div v-else-if="step === 3" key="step3">
                    <div class="step-title">
                      <span class="step-icon">✅</span> Hakiki na Kamilisha
                    </div>
                    <div class="summary-card">
                      <div class="s-header">
                        <h3>Taarifa Zako za Biashara</h3>
                        <span class="secure-badge">🔒 Zinalindwa kwa Encryption</span>
                      </div>
                      <div class="s-body">
                        <div class="s-row">
                          <span>🏢 Biashara:</span> 
                          <strong>{{ regForm.businessName }}</strong>
                        </div>
                        <div class="s-row">
                          <span>👤 Mmiliki:</span> 
                          <strong>{{ regForm.fullName }}</strong>
                        </div>
                        <div class="s-row">
                          <span>📱 Namba:</span> 
                          <strong>+{{ regForm.countryCode }} {{ regForm.phone }}</strong>
                        </div>
                      </div>
                    </div>
                    <p class="terms-text mt-3">
                      Kwa kubofya <strong>"Kamilisha Usajili"</strong>, unakubaliana na 
                      <a href="?privacy=true" @click.prevent="openPrivacy" class="privacy-link">Sera ya Faragha</a> yetu.
                    </p>
                  </div>

                </transition>
                
                <div class="action-buttons mt-5">
                  <button v-if="step > 1" type="button" @click="prevStep" class="btn-secondary" :disabled="isLoading">
                    ← Rudi Nyuma
                  </button>
                  <button v-if="step < 3" type="submit" class="btn-primary flex-2">
                    Endelea Mbele →
                  </button>
                  <button v-if="step === 3" type="button" @click="completeRegistration" class="btn-success flex-2" :disabled="isLoading">
                    <span v-if="isLoading" class="loader"></span>
                    <span v-else>✅ Kamilisha Usajili</span>
                  </button>
                </div>
              </form>
              
              <div class="switch-mode" v-if="step === 1">
                <p>Umeshasajiliwa tayari?</p>
                <button @click="toggleMode" class="btn-text">Ingia Kwenye Akaunti →</button>
                
                <div class="mobile-privacy-link mt-4">
                  <a href="?privacy=true" @click.prevent="openPrivacy" class="m-link">
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
import { ref, reactive, computed, onMounted } from 'vue';
import axios from 'axios';
import Dashboard from './components/Dashboard.vue';

const API_URL = 'https://apibulksms.kedeshlimited.com';

const countries = [
  { code: '255', flag: '🇹🇿', name: 'Tanzania' }, { code: '254', flag: '🇰🇪', name: 'Kenya' },
  { code: '256', flag: '🇺🇬', name: 'Uganda' }, { code: '250', flag: '🇷🇼', name: 'Rwanda' },
  { code: '257', flag: '🇧🇮', name: 'Burundi' }, { code: '243', flag: '🇨🇩', name: 'DR Congo' },
  { code: '27', flag: '🇿🇦', name: 'South Africa' }, { code: '234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '233', flag: '🇬🇭', name: 'Ghana' }, { code: '260', flag: '🇿🇲', name: 'Zambia' },
  { code: '263', flag: '🇿🇼', name: 'Zimbabwe' }, { code: '265', flag: '🇲🇼', name: 'Malawi' },
  { code: '1', flag: '🇺🇸', name: 'USA/Canada' }, { code: '44', flag: '🇬🇧', name: 'UK' },
  { code: '971', flag: '🇦🇪', name: 'UAE' }, { code: '91', flag: '🇮🇳', name: 'India' }
];

// Form focus states
const phoneFocused = ref(false); 
const passFocused = ref(false); 
const bizFocused = ref(false);
const nameFocused = ref(false); 
const regPhoneFocused = ref(false); 
const regPassFocused = ref(false);
const confPassFocused = ref(false);

// Password visibility
const showLoginPass = ref(false);
const showRegPass = ref(false);
const showConfPass = ref(false);

// Auth states
const isAuthenticated = ref(false);
const isRedirecting = ref(false);
const currentUser = ref(null);
const isLogin = ref(true);
const step = ref(1);
const isLoading = ref(false);
const isFacebookAuth = ref(false); 
const justRegistered = ref(false);
const passError = ref(false);
const authError = ref('');
const authWarning = ref(''); 
const showPrivacy = ref(false);

// Password strength computation
const passwordStrengthPercent = computed(() => {
  const pwd = regForm.password;
  if (!pwd) return 0;
  let strength = 0;
  if (pwd.length >= 6) strength += 20;
  if (pwd.length >= 8) strength += 20;
  if (/[A-Z]/.test(pwd)) strength += 20;
  if (/[0-9]/.test(pwd)) strength += 20;
  if (/[^A-Za-z0-9]/.test(pwd)) strength += 20;
  return strength;
});

const passwordStrengthLabel = computed(() => {
  const pct = passwordStrengthPercent.value;
  if (pct <= 20) return 'Dhaifu sana';
  if (pct <= 40) return 'Dhaifu';
  if (pct <= 60) return 'Wastani';
  if (pct <= 80) return 'Nguvu';
  return 'Nguvu sana';
});

const passwordStrengthClass = computed(() => {
  const pct = passwordStrengthPercent.value;
  if (pct <= 20) return 'strength-weak';
  if (pct <= 40) return 'strength-fair';
  if (pct <= 60) return 'strength-good';
  if (pct <= 80) return 'strength-strong';
  return 'strength-excellent';
});

// Check for privacy param on mount
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

// Form data
const loginForm = reactive({ countryCode: '255', phone: '', password: '' });
const regForm = reactive({ businessName: '', fullName: '', countryCode: '255', phone: '', password: '', confirmPassword: '' });

const formatPhone = (code, phone) => `${code}${phone.replace(/^0+/, '')}`.replace(/\s+/g, '');

const toggleMode = () => { 
  isLogin.value = !isLogin.value; 
  step.value = 1; 
  authError.value = ''; 
  authWarning.value = '';
  justRegistered.value = false; 
  closePrivacy(); 
};

const prevStep = () => { if (step.value > 1) step.value--; };

const nextStep = () => {
  authError.value = '';
  if (step.value === 2 && regForm.password !== regForm.confirmPassword) { 
    passError.value = true; 
    return; 
  }
  passError.value = false;
  if (step.value < 3) step.value++;
};

// 🔥 FACEBOOK LOGIN - STANDARD (IMETOLEWA CONFIG_ID NA EXTRAS) 🔥
const loginWithFacebook = () => {
  isLoading.value = true;
  isFacebookAuth.value = true;
  authError.value = '';
  authWarning.value = '';

  if (!window.FB) {
    isLoading.value = false;
    isFacebookAuth.value = false;
    authError.value = "Mfumo wa Meta haujakamilika kufunguka. Tafadhali refresh ukurasa.";
    return;
  }

  // 🔥 TUNAITUMIA STANDARD FB LOGIN (HAKUNA 'extras' wala 'config_id') 🔥
  window.FB.login((response) => {
    if (response.authResponse) {
      // Tumia accessToken moja kwa moja
      processFacebookAuth(response.authResponse.accessToken);
    } else {
      isLoading.value = false;
      isFacebookAuth.value = false;
      authWarning.value = "Umesitisha zoezi la kuunganisha akaunti yako. Unaweza kujaribu tena.";
    }
  }, {
    // 🔥 SCOPES ZA TECH PROVIDER (LAZIMA KUPATA WABA NA PHONE ID) 🔥
    scope: 'public_profile,email,whatsapp_business_management,whatsapp_business_messaging',
    auth_type: 'rerequest' // Inamruhusu mteja kutoa ruhusa upya kila anapoingia
  });
};

const processFacebookAuth = async (accessToken) => {
  try {
    const res = await axios.post(`${API_URL}/facebook-login`, { accessToken });
    
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

const completeRegistration = async () => {
  isLoading.value = true; 
  isFacebookAuth.value = false; 
  authError.value = '';
  try {
    const fullPhone = formatPhone(regForm.countryCode, regForm.phone);
    await axios.post(`${API_URL}/register`, {
      businessName: regForm.businessName, 
      fullName: regForm.fullName,
      phone: fullPhone, 
      password: regForm.password
    });
    justRegistered.value = true; 
    isLogin.value = true; 
    step.value = 1; 
    closePrivacy();
    // Reset form
    regForm.phone = ''; 
    regForm.password = ''; 
    regForm.confirmPassword = '';
    regForm.businessName = '';
    regForm.fullName = '';
  } catch (error) {
    authError.value = error.response?.data?.error || "Kosa la kimtandao limejitokeza wakati wa usajili.";
  } finally { 
    isLoading.value = false; 
  }
};

const handleLogin = async () => {
  isLoading.value = true; 
  isFacebookAuth.value = false; 
  authError.value = '';
  try {
    const fullPhone = formatPhone(loginForm.countryCode, loginForm.phone);
    const res = await axios.post(`${API_URL}/login`, { 
      phone: fullPhone, 
      password: loginForm.password 
    });
    
    if(res.data.success) {
      localStorage.setItem('msamba_token', res.data.token);
      currentUser.value = res.data.user;
      
      isLoading.value = false;
      isRedirecting.value = true; 
      
      setTimeout(() => {
        isRedirecting.value = false;
        isAuthenticated.value = true; 
      }, 2500);
    }
  } catch (error) {
    isLoading.value = false;
    authError.value = error.response?.data?.error || "Taarifa ulizoingiza si sahihi. Hakiki namba na nenosiri.";
  } 
};

const logout = () => { 
  isRedirecting.value = true;
  setTimeout(() => {
    isAuthenticated.value = false; 
    currentUser.value = null; 
    loginForm.password = ''; 
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

/* ======== REDIRECT SCREEN (PREMIUM LOADER) ======== */
.redirect-screen { 
  display: flex; 
  height: 100vh; 
  width: 100vw; 
  background: linear-gradient(135deg, #020617 0%, #1e1b4b 100%); 
  justify-content: center; 
  align-items: center; 
  color: white;
}

.redirect-content { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  text-align: center; 
  max-width: 450px; 
  padding: 20px;
}

/* Animated Checkmark */
.success-animation { 
  margin-bottom: 24px; 
}

.checkmark {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: block;
  stroke-width: 3;
  stroke: #10b981;
  stroke-miterlimit: 10;
  animation: scaleCheck 0.5s ease-in-out 0.3s both;
}

.checkmark-circle {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-width: 3;
  stroke: #10b981;
  fill: none;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

.checkmark-check {
  transform-origin: 50% 50%;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
}

@keyframes stroke {
  100% { stroke-dashoffset: 0; }
}

@keyframes scaleCheck {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}

.redirect-title { 
  font-size: 2.4rem; 
  font-weight: 800; 
  color: #f8fafc; 
  margin-bottom: 10px; 
  letter-spacing: -0.5px;
}

.redirect-text { 
  color: #94a3b8; 
  font-size: 1.15rem; 
  margin-bottom: 35px; 
}

.loader-bar-container { 
  width: 100%; 
  height: 6px; 
  background: rgba(255,255,255,0.1); 
  border-radius: 10px; 
  margin: 0 auto 20px auto; 
  overflow: hidden; 
}

.loader-progress { 
  height: 100%; 
  background: linear-gradient(90deg, #4f46e5, #10b981, #4f46e5); 
  background-size: 200% 100%;
  width: 0%; 
  border-radius: 10px; 
  animation: loadBar 2.5s ease-in-out forwards, shimmer 2s infinite;
}

@keyframes loadBar { 
  0% { width: 0%; } 
  100% { width: 100%; } 
}

@keyframes shimmer {
  0% { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
}

.secure-badge-redirect { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  color: #10b981; 
  font-size: 0.9rem; 
  font-weight: 700; 
  background: rgba(16, 185, 129, 0.1); 
  padding: 12px 24px; 
  border-radius: 30px; 
  border: 1px solid rgba(16, 185, 129, 0.2); 
}

/* Page Transitions */
.page-fade-enter-active, .page-fade-leave-active { 
  transition: opacity 0.5s ease, transform 0.5s ease; 
}

.page-fade-enter-from { 
  opacity: 0; 
  transform: scale(0.98); 
}

.page-fade-leave-to { 
  opacity: 0; 
  transform: scale(1.02); 
}

/* ======== MAIN AUTH LAYOUT ======== */
.auth-container { 
  display: flex; 
  min-height: 100vh; 
  width: 100vw; 
  background: #f0f4f8; 
  overflow-x: hidden; 
}

/* ======== BRAND SIDE ======== */
.brand-side { 
  flex: 1; 
  background: linear-gradient(135deg, #020617 0%, #1e1b4b 100%); 
  color: white; 
  padding: 4rem; 
  position: relative; 
  display: flex; 
  flex-direction: column; 
  justify-content: center; 
  overflow: hidden; 
}

.brand-bg-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(79, 70, 229, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.06) 0%, transparent 50%);
  z-index: 1;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  z-index: 1;
  opacity: 0.4;
  animation: float 12s ease-in-out infinite alternate;
}

.orb-1 { 
  width: 450px; 
  height: 450px; 
  background: #4f46e5; 
  top: -120px; 
  left: -100px; 
}

.orb-2 { 
  width: 350px; 
  height: 350px; 
  background: #10b981; 
  bottom: -80px; 
  right: -60px; 
  animation-delay: 4s;
}

.orb-3 { 
  width: 250px; 
  height: 250px; 
  background: #ec4899; 
  top: 45%; 
  left: 35%; 
  opacity: 0.15; 
  animation-delay: 6s;
}

@keyframes float { 
  0% { transform: translate(0, 0) scale(1); } 
  100% { transform: translate(35px, 35px) scale(1.08); } 
}

.brand-content { 
  z-index: 10; 
  display: flex; 
  flex-direction: column; 
  justify-content: space-between; 
  height: 100%; 
  min-height: 500px;
}

.brand-top .logo { 
  height: 60px; 
  object-fit: contain; 
  margin-top: 1rem;
}

.premium-badge { 
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08); 
  border: 1px solid rgba(255, 255, 255, 0.15); 
  padding: 8px 18px; 
  border-radius: 30px; 
  font-size: 0.85rem; 
  font-weight: 700; 
  color: #e0e7ff; 
  backdrop-filter: blur(10px); 
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

.hero-title { 
  font-size: 3.4rem; 
  font-weight: 800; 
  line-height: 1.15; 
  margin-top: 1.5rem; 
  margin-bottom: 1.5rem; 
  letter-spacing: -1.5px;
}

.gradient-text {
  background: linear-gradient(135deg, #4f46e5, #10b981);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle { 
  font-size: 1.15rem; 
  color: #cbd5e1; 
  line-height: 1.7; 
  margin-bottom: 2.5rem; 
  max-width: 90%; 
}

.stats-mini {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 800;
  color: #f8fafc;
}

.stat-label {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 500;
}

.stat-divider-vertical {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
}

.brand-bottom { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  font-size: 0.95rem; 
  color: #64748b; 
  border-top: 1px solid rgba(255, 255, 255, 0.1); 
  padding-top: 20px;
}

.links a { 
  color: #94a3b8; 
  text-decoration: none; 
  transition: 0.3s; 
  font-weight: 600;
}

.links a:hover { 
  color: white; 
  text-decoration: underline;
}

.dot { 
  margin: 0 10px; 
  opacity: 0.5;
}

/* ======== FORM SIDE ======== */
.form-side { 
  flex: 1.3; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  background: #ffffff; 
  padding: 2rem; 
  position: relative; 
}

.form-wrapper { 
  width: 100%; 
  max-width: 460px; 
  transition: max-width 0.4s ease; 
  margin: 0 auto; 
} 

.wide-wrapper { 
  max-width: 750px; 
} 

/* ======== CARDS & FORMS ======== */
.glass-card { 
  background: white; 
  padding: 3rem 2.5rem; 
  border-radius: 24px; 
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08); 
  border: 1px solid rgba(226, 232, 240, 0.8); 
  width: 100%; 
  transition: all 0.3s ease;
}

.form-header { 
  text-align: center; 
  margin-bottom: 2.5rem; 
}

.header-icon-wrapper {
  margin-bottom: 12px;
}

.header-icon { 
  font-size: 3.5rem; 
  display: inline-block; 
  animation: wave 2.5s infinite; 
  transform-origin: 70% 70%; 
}

@keyframes wave { 
  0% { transform: rotate(0deg); } 
  10% { transform: rotate(14deg); } 
  20% { transform: rotate(-8deg); } 
  30% { transform: rotate(14deg); } 
  40% { transform: rotate(-4deg); } 
  50% { transform: rotate(10deg); } 
  60%, 100% { transform: rotate(0deg); } 
}

.form-header h2 { 
  font-size: 1.9rem; 
  font-weight: 800; 
  color: #0f172a; 
  margin-bottom: 6px; 
}

.form-header p { 
  color: #64748b; 
  font-size: 0.95rem; 
}

/* 🔥 FACEBOOK BUTTON STYLES 🔥 */
.facebook-auth-section { 
  margin-bottom: 1.5rem; 
  width: 100%; 
}

.btn-facebook { 
  width: 100%; 
  background: #1877F2; 
  color: white; 
  padding: 16px; 
  border-radius: 12px; 
  border: none; 
  font-size: 1.05rem; 
  font-weight: 700; 
  cursor: pointer; 
  box-shadow: 0 4px 15px rgba(24, 119, 242, 0.3); 
  transition: all 0.3s ease; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
}

.btn-facebook:hover:not(:disabled) { 
  transform: translateY(-2px); 
  box-shadow: 0 8px 25px rgba(24, 119, 242, 0.4); 
  background: #166fe5; 
}

.btn-facebook:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.fb-content { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
}

.fb-hint {
  text-align: center;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 8px;
  font-weight: 500;
}

.divider { 
  display: flex; 
  align-items: center; 
  text-align: center; 
  margin: 1.8rem 0; 
  color: #94a3b8; 
  font-size: 0.8rem; 
  font-weight: 700; 
}

.divider::before, 
.divider::after { 
  content: ''; 
  flex: 1; 
  border-bottom: 1px solid #e2e8f0; 
}

.divider span { 
  padding: 0 15px; 
  background: white;
}

/* ======== ALERTS ======== */
.alert-box { 
  padding: 16px; 
  border-radius: 12px; 
  margin-bottom: 20px; 
  font-size: 0.9rem; 
  font-weight: 500; 
  display: flex; 
  align-items: flex-start; 
  gap: 12px; 
  text-align: left; 
}

.alert-box .a-icon { 
  font-size: 1.3rem; 
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

.success { 
  background: #ecfdf5; 
  color: #065f46; 
  border: 1px solid #a7f3d0; 
}

.error { 
  background: #fef2f2; 
  color: #b91c1c; 
  border: 1px solid #fecaca; 
}

.warning { 
  background: #fffbeb; 
  color: #92400e; 
  border: 1px solid #fde68a; 
} 

.info { 
  background: #eff6ff; 
  color: #1e40af; 
  border: 1px solid #bfdbfe; 
}

/* ======== INPUTS ======== */
.input-group { 
  margin-bottom: 1.5rem; 
}

.input-group label { 
  display: block; 
  font-size: 0.9rem; 
  font-weight: 700; 
  color: #334155; 
  margin-bottom: 8px; 
  text-align: left;
}

.label-row { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 8px; 
}

.label-row label { 
  margin-bottom: 0; 
}

.forgot-link { 
  color: #4f46e5; 
  font-size: 0.85rem; 
  font-weight: 600; 
  text-decoration: none; 
  transition: 0.3s;
}

.forgot-link:hover { 
  color: #3730a3; 
  text-decoration: underline; 
}

.modern-input-wrapper { 
  display: flex; 
  align-items: center; 
  background: #f8fafc; 
  border: 2px solid #e2e8f0; 
  border-radius: 12px; 
  overflow: hidden; 
  transition: all 0.3s ease; 
  width: 100%;
}

.modern-input-wrapper.is-focused { 
  border-color: #4f46e5; 
  background: white; 
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); 
}

.modern-input-wrapper.is-error { 
  border-color: #ef4444; 
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1); 
}

.country-select { 
  border: none; 
  background: transparent; 
  padding: 16px 10px 16px 15px; 
  font-size: 0.95rem; 
  font-weight: 700; 
  color: #0f172a; 
  outline: none; 
  cursor: pointer; 
  max-width: 120px;
}

.input-divider { 
  width: 2px; 
  height: 24px; 
  background: #e2e8f0; 
  margin: 0 5px; 
}

.modern-input { 
  flex: 1; 
  border: none; 
  background: transparent; 
  padding: 16px 15px 16px 5px; 
  font-size: 1rem; 
  color: #0f172a; 
  outline: none; 
  font-weight: 600; 
  width: 100%;
}

.modern-input::placeholder { 
  color: #94a3b8; 
  font-weight: 400;
}

.input-icon { 
  padding: 0 8px 0 15px; 
  font-size: 1.2rem; 
  color: #64748b; 
}

.toggle-pass-btn {
  background: none;
  border: none;
  padding: 0 15px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: 0.2s;
  opacity: 0.6;
}

.toggle-pass-btn:hover {
  opacity: 1;
}

/* Password Strength */
.password-strength {
  margin-top: 10px;
}

.strength-bar {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 6px;
}

.strength-fill {
  height: 100%;
  border-radius: 10px;
  transition: all 0.4s ease;
}

.strength-weak { background: #ef4444; }
.strength-fair { background: #f59e0b; }
.strength-good { background: #eab308; }
.strength-strong { background: #84cc16; }
.strength-excellent { background: #10b981; }

.strength-text {
  font-size: 0.8rem;
  font-weight: 600;
}

.strength-text.strength-weak { color: #ef4444; }
.strength-text.strength-fair { color: #f59e0b; }
.strength-text.strength-good { color: #eab308; }
.strength-text.strength-strong { color: #84cc16; }
.strength-text.strength-excellent { color: #10b981; }

/* ======== BUTTONS ======== */
button { 
  cursor: pointer; 
  border-radius: 12px; 
  font-size: 1.05rem; 
  font-weight: 700; 
  border: none; 
  transition: all 0.3s ease; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  gap: 8px;
}

.btn-primary { 
  width: 100%; 
  background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); 
  color: white; 
  padding: 18px; 
  box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3); 
}

.btn-primary:hover:not(:disabled) { 
  transform: translateY(-2px); 
  box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4); 
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-arrow {
  font-size: 1.2rem;
  transition: transform 0.3s ease;
}

.btn-primary:hover:not(:disabled) .btn-arrow {
  transform: translateX(4px);
}

.btn-success { 
  background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
  color: white; 
  padding: 16px; 
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); 
}

.btn-success:hover:not(:disabled) { 
  transform: translateY(-2px); 
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4); 
}

.btn-success:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary { 
  background: #f1f5f9; 
  color: #475569; 
  padding: 16px; 
  flex: 1;
}

.btn-secondary:hover { 
  background: #e2e8f0; 
}

.btn-text-outline { 
  width: 100%; 
  padding: 16px; 
  background: transparent; 
  color: #0f172a; 
  border: 2px solid #e2e8f0; 
  margin-top: 15px; 
}

.btn-text-outline:hover { 
  border-color: #cbd5e1; 
  background: #f8fafc;
}

.btn-text { 
  background: none; 
  border: none; 
  color: #4f46e5; 
  font-weight: 700; 
  font-size: 0.95rem; 
  cursor: pointer; 
  transition: 0.3s; 
  padding: 5px; 
}

.btn-text:hover { 
  text-decoration: underline; 
}

.btn-icon {
  font-weight: 700;
}

.action-buttons { 
  display: flex; 
  gap: 15px; 
}

.flex-2 { 
  flex: 2; 
}

.w-100 {
  width: 100%;
}

.mt-3 { margin-top: 1rem; } 
.mt-4 { margin-top: 1.5rem; } 
.mt-5 { margin-top: 2rem; } 
.mb-4 { margin-bottom: 1.5rem; }

.error-msg { 
  display: block; 
  color: #ef4444; 
  font-size: 0.85rem; 
  font-weight: 600; 
  margin-top: 8px; 
  text-align: left;
}

.loader { 
  border: 3px solid rgba(255,255,255,0.3); 
  border-top: 3px solid white; 
  border-radius: 50%; 
  width: 22px; 
  height: 22px; 
  animation: spin 1s linear infinite; 
}

@keyframes spin { 
  0% { transform: rotate(0deg); } 
  100% { transform: rotate(360deg); } 
}

/* ======== STEPPER ======== */
.stepper { 
  width: 100%; 
  margin-bottom: 2rem; 
}

.step-fill { 
  height: 6px; 
  background: linear-gradient(90deg, #4f46e5, #10b981); 
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); 
  border-radius: 10px; 
}

.step-dots {
  display: flex;
  justify-content: space-between;
  margin-top: -18px;
  padding: 0 10px;
}

.step-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e2e8f0;
  border: 2px solid #e2e8f0;
  transition: all 0.4s ease;
}

.step-dot.active {
  background: #4f46e5;
  border-color: #4f46e5;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.15);
}

.step-dot.completed {
  background: #10b981;
  border-color: #10b981;
}

.step-title {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-icon {
  font-size: 1.3rem;
}

/* ======== SUMMARY CARD ======== */
.summary-card { 
  background: #f8fafc; 
  border: 2px dashed #cbd5e1; 
  padding: 25px; 
  border-radius: 16px; 
  text-align: left; 
  margin-bottom: 15px;
}

.s-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 8px;
}

.s-header h3 { 
  color: #0f172a; 
  font-size: 1.1rem; 
  margin: 0;
}

.secure-badge { 
  font-size: 0.75rem; 
  background: #d1fae5; 
  color: #059669; 
  padding: 5px 12px; 
  border-radius: 20px; 
  font-weight: 700;
}

.s-body { 
  background: white; 
  padding: 15px 20px; 
  border-radius: 12px; 
  border: 1px solid #e2e8f0; 
}

.s-row { 
  display: flex; 
  justify-content: space-between; 
  margin-bottom: 12px; 
  font-size: 0.95rem; 
  border-bottom: 1px dashed #e2e8f0; 
  padding-bottom: 10px;
  color: #64748b;
}

.s-row:last-child { 
  border-bottom: none; 
  margin-bottom: 0; 
  padding-bottom: 0;
}

.s-row strong {
  color: #0f172a;
}

.terms-text { 
  text-align: center; 
  color: #64748b; 
  font-size: 0.85rem;
  line-height: 1.6;
}

.privacy-link {
  color: #4f46e5; 
  text-decoration: underline; 
  font-weight: 700;
  cursor: pointer;
}

/* ======== SWITCH MODE ======== */
.switch-mode { 
  margin-top: 2.5rem; 
  text-align: center; 
  border-top: 1px solid #f1f5f9; 
  padding-top: 2rem; 
}

.switch-mode p { 
  color: #64748b; 
  font-size: 0.95rem; 
  margin-bottom: 10px; 
}

/* ======== PRIVACY CARD ======== */
.privacy-card { 
  padding: 2.5rem 3rem !important; 
  display: flex; 
  flex-direction: column; 
  max-height: 85vh; 
}

.privacy-header { 
  border-bottom: 1px solid #e2e8f0; 
  padding-bottom: 1.5rem; 
  margin-bottom: 1.5rem; 
  text-align: center; 
  flex-shrink: 0;
}

.privacy-header h2 { 
  font-size: 1.6rem; 
  color: #0f172a; 
  font-weight: 800; 
  margin: 10px 0 5px 0;
}

.privacy-meta { 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  gap: 10px; 
  font-size: 0.85rem; 
  color: #64748b; 
  flex-wrap: wrap;
}

.badge { 
  background: #e0e7ff; 
  color: #4f46e5; 
  padding: 4px 12px; 
  border-radius: 20px; 
  font-weight: 700;
  font-size: 0.8rem;
}

.dot-separator {
  color: #cbd5e1;
}

.privacy-content { 
  overflow-y: auto; 
  padding-right: 15px; 
  text-align: left; 
}

.custom-scrollbar::-webkit-scrollbar { 
  width: 6px; 
}

.custom-scrollbar::-webkit-scrollbar-track { 
  background: #f1f5f9; 
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb { 
  background: #cbd5e1; 
  border-radius: 10px; 
}

.p-section { 
  margin-bottom: 1.8rem; 
}

.p-section h3 { 
  font-size: 1.1rem; 
  color: #0f172a; 
  margin-bottom: 10px; 
  font-weight: 800; 
}

.p-section p, 
.p-section ul { 
  font-size: 0.95rem; 
  color: #475569; 
  line-height: 1.7; 
  margin-bottom: 10px;
}

.p-section ul { 
  padding-left: 20px; 
}

.p-section li { 
  margin-bottom: 8px; 
}

.contact-box { 
  background: #f8fafc; 
  padding: 20px; 
  border-radius: 12px; 
  border: 1px dashed #cbd5e1; 
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.contact-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.contact-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.contact-item strong {
  display: block;
  color: #0f172a;
  margin-bottom: 2px;
}

.contact-item p {
  margin: 0;
  color: #64748b;
}

/* ======== TRANSITIONS ======== */
.fade-slide-enter-active, 
.fade-slide-leave-active { 
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
}

.fade-slide-enter-from { 
  opacity: 0; 
  transform: scale(0.95) translateY(20px); 
}

.fade-slide-leave-to { 
  opacity: 0; 
  transform: scale(1.05) translateY(-20px); 
}

.slide-down-enter-active, 
.slide-down-leave-active { 
  transition: all 0.3s ease; 
}

.slide-down-enter-from, 
.slide-down-leave-to { 
  opacity: 0; 
  transform: translateY(-15px); 
}

.slide-left-enter-active, 
.slide-left-leave-active { 
  transition: all 0.35s ease; 
}

.slide-left-enter-from { 
  opacity: 0; 
  transform: translateX(40px); 
}

.slide-left-leave-to { 
  opacity: 0; 
  transform: translateX(-40px); 
}

/* ======== MOBILE PRIVACY LINK ======== */
.mobile-privacy-link { 
  display: none; 
  margin-top: 15px; 
  font-size: 0.95rem; 
}

.mobile-privacy-link a { 
  color: #4f46e5; 
  text-decoration: none; 
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.mobile-privacy-link a:hover {
  text-decoration: underline;
}

/* ======== RESPONSIVENESS ======== */
@media (max-width: 992px) {
  .auth-container { 
    flex-direction: column; 
    height: auto; 
    overflow-y: auto; 
  }
  
  .brand-side { 
    padding: 3rem 1.5rem; 
    flex: none; 
    text-align: center; 
    align-items: center; 
  }
  
  .desktop-only { 
    display: none; 
  } 
  
  .mobile-privacy-link { 
    display: block; 
  } 
  
  .hero-title { 
    font-size: 2.2rem; 
  }
  
  .subtitle { 
    max-width: 100%; 
    font-size: 1rem; 
    margin-bottom: 1.5rem;
  }
  
  .stats-mini {
    justify-content: center;
  }
  
  .form-side { 
    padding: 2rem 1rem; 
    align-items: flex-start; 
  }
  
  .glass-card { 
    padding: 2rem 1.5rem; 
    margin-bottom: 2rem; 
    width: 100%;
  }
  
  .privacy-card { 
    padding: 1.5rem !important; 
    max-height: none; 
  } 
  
  .wide-wrapper { 
    max-width: 100%; 
  }
}

@media (max-width: 480px) {
  .hero-title { 
    font-size: 1.8rem; 
  }
  
  .glass-card { 
    padding: 1.5rem 1.2rem; 
    border-radius: 16px;
  }
  
  .form-header h2 { 
    font-size: 1.5rem; 
  }
  
  .country-select { 
    max-width: 90px; 
    padding-left: 5px; 
    font-size: 0.85rem;
  }
  
  .modern-input { 
    font-size: 0.95rem; 
    padding-left: 5px;
  }
  
  .action-buttons { 
    flex-direction: column; 
  } 
  
  .btn-primary, 
  .btn-secondary, 
  .btn-success, 
  .btn-text-outline { 
    width: 100%; 
    padding: 14px; 
    font-size: 0.95rem;
  }
  
  .stats-mini {
    flex-direction: column;
    gap: 12px;
  }
  
  .stat-divider-vertical {
    width: 40px;
    height: 1px;
  }
  
  .privacy-card {
    padding: 1.2rem !important;
  }
}
</style>