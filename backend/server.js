require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
const axios = require('axios');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const { PrismaClient } = require('@prisma/client'); 

// 🚀 TUNAINGIZA SOCKET.IO NA HTTP SERVER 🚀
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// 🔥 Kutatua kosa la X-Forwarded-For kwenye Render au Cloud Proxy 🔥
app.set('trust proxy', 1);

const server = http.createServer(app); 

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient(); 

// ==========================================
// ⚙️ 1. BEI ZA KIBILIONEA (SAAS PRICING) 💰
// ==========================================
const BULK_SMS_COST = 84;   // Makato kwa Bulk SMS
const LIVE_CHAT_COST = 30;  // Makato kwa Live Chat

// Tunavuta funguo zote muhimu kutoka kwenye .env
const { META_VERIFY_TOKEN, META_ACCESS_TOKEN, META_APP_ID, META_APP_SECRET } = process.env;
const JWT_SECRET = process.env.JWT_SECRET || "KEDESH_LIMITED_PREMIUM_SECRET_2026"; 

// ULINZI: Tunazuia Server isiwake kama funguo za Meta hazijakamilika
if (!META_VERIFY_TOKEN || !META_ACCESS_TOKEN || !META_APP_ID || !META_APP_SECRET) {
    console.error("\n🚨 [KOSA KUBWA LAKIUSALAMA] 🚨");
    console.error("Server imeshindwa kuwaka. Funguo za Meta hazijakamilika kwenye .env");
    console.error("Tafadhali weka META_VERIFY_TOKEN, META_ACCESS_TOKEN, META_APP_ID, na META_APP_SECRET kwanza.\n");
    process.exit(1); 
}

// ==========================================
// 🛡️ MIDDLEWARE ZA ULINZI
// ==========================================
app.use(helmet()); 
app.use(cors()); 
app.use(express.json({ limit: '5mb' })); 

const apiLimiter = rateLimit({ 
    windowMs: 1 * 60 * 1000, 
    max: 150, 
    standardHeaders: true, 
    legacyHeaders: false,
    message: { success: false, error: "Umefikia kikomo cha maombi. Subiri dakika 1." }
});
app.use('/api/', apiLimiter); 

const authLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 10, 
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Umejaribu mara nyingi mno. Subiri dakika 15." } 
});

// ==========================================
// 🔐 MIDDLEWARE YA KUTHIBITISHA TOKEN
// ==========================================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ success: false, error: "Huruhusiwi, Tiketi inahitajika." });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).json({ success: false, error: "Muundo wa tiketi si sahihi." });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ success: false, error: "Tiketi imekwisha muda wake. Ingia upya kwenye mfumo." });
            }
            return res.status(401).json({ success: false, error: "Tiketi si halali. Ingia upya." });
        }
        req.user = decoded; 
        next();
    });
};

// ==========================================
// 🚀 ENGINE YA KUTUMA UJUMBE (HYBRID MULTI-TENANT)
// ==========================================

/**
 * 🔥 FUNCTION YA KUTUMA KWA NIABA YA MTEJA (ADMIN TOKEN)
 * Hii ndiyo siri ya Tech Provider:
 * - Inatumia META_ACCESS_TOKEN ya Admin (Kedesh Limited) kutuma ujumbe
 * - Meta inakuchaji wewe kwenye akaunti yako ya Business Manager
 * - Lakini tunakagua salio la mteja kwenye database yetu kabla ya kutuma
 * - Hii inalinda biashara yako na kuhakikisha huwezi kutumia zaidi ya alicholipa mteja
 */
const sendWhatsAppMessageAsAdmin = async (business, phone, payload, type = 'text') => {
    // 🔑 Tunatumia APP ACCESS TOKEN ya KEDESH (Admin)
    const adminToken = META_ACCESS_TOKEN;
    const url = `https://graph.facebook.com/v20.0/${business.whatsappPhoneId}/messages`;
    
    return await axios({
        method: 'POST',
        url: url,
        headers: { 
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json' 
        },
        data: {
            messaging_product: "whatsapp",
            to: phone,
            type: type,
            ...(type === 'text' ? { text: { body: payload } } : { template: payload })
        },
        timeout: 15000 // 15 seconds timeout
    });
};

/**
 * 🔒 FUNCTION YA KUTHIBITISHA TOKEN YA MTEJA (KWA LOGIN TU)
 */
const verifyCustomerToken = async (customerToken) => {
    try {
        const response = await axios.get(`https://graph.facebook.com/me?fields=id,name&access_token=${customerToken}`, {
            timeout: 10000
        });
        return response.data;
    } catch (error) {
        throw new Error("Token ya mteja si halali au imekwisha muda.");
    }
};

// ========================================================
// ⚡ 2. MTAMBO WA SOCKET.IO (REAL-TIME ENGINE) ⚡
// ========================================================
io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error("Huruhusiwi. Hakuna Tiketi."));

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Tiketi imekwisha muda."));
        socket.businessId = decoded.businessId; 
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`🔌 [SOCKET LIVE] Ofisi ID: ${socket.businessId} imeunganishwa papo hapo.`);
    socket.join(socket.businessId);

    socket.on('disconnect', () => {
        console.log(`🔴 [SOCKET OFF] Ofisi ID: ${socket.businessId} imetoka hewani.`);
    });
});

// ==========================================
// 📊 3. API YA TAKWIMU (DASHBOARD STATS)
// ==========================================
app.get('/api/dashboard/stats', verifyToken, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        
        const [totalSent, totalDelivered, totalContacts, totalFailed, business] = await Promise.all([
            prisma.message.count({ where: { businessId, direction: 'OUTBOUND' } }),
            prisma.message.count({ where: { businessId, direction: 'OUTBOUND', status: { in: ['DELIVERED', 'READ'] } } }),
            prisma.contact.count({ where: { businessId } }),
            prisma.message.count({ where: { businessId, direction: 'OUTBOUND', status: 'FAILED' } }),
            prisma.business.findUnique({ where: { id: businessId }, select: { walletBalance: true } })
        ]);

        const walletBalance = business?.walletBalance || 0;

        res.status(200).json({ 
            success: true, 
            stats: { 
                totalContacts, 
                totalSent, 
                totalDelivered, 
                totalFailed,
                walletBalance
            } 
        });
    } catch (error) { 
        console.error("❌ [Stats Error]:", error.message);
        res.status(500).json({ success: false, error: "Imeshindwa kuvuta takwimu. Tafadhali jaribu tena." }); 
    }
});

// ==========================================
// 💰 3B. API YA KUTAZAMA SALIO
// ==========================================
app.get('/api/wallet/balance', verifyToken, async (req, res) => {
    try {
        const business = await prisma.business.findUnique({ 
            where: { id: req.user.businessId },
            select: { walletBalance: true, businessName: true }
        });
        
        if (!business) {
            return res.status(404).json({ success: false, error: "Biashara haijapatikana." });
        }
        
        res.status(200).json({ 
            success: true, 
            walletBalance: business.walletBalance,
            businessName: business.businessName
        });
    } catch (error) {
        console.error("❌ [Wallet Error]:", error.message);
        res.status(500).json({ success: false, error: "Imeshindwa kuvuta salio." });
    }
});

// ==========================================
// 🔐 4. API ZA AUTHENTICATION
// ==========================================

// 4.1: USAJILI WA KAWAIDA
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { businessName, fullName, phone, password } = req.body;
        
        if (!phone || !password) {
            return res.status(400).json({ success: false, error: "Namba ya simu na nenosiri ni lazima." });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: "Nenosiri linatakiwa liwe na angalau herufi 6." });
        }

        const existingBusiness = await prisma.business.findFirst({ where: { phone } });
        if (existingBusiness) {
            return res.status(400).json({ success: false, error: "Namba hii tayari imeshasajiliwa. Tafadhali ingia." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 🔥 HAKUNA 'isActive' - IMETOLEWA KABISA 🔥
        await prisma.business.create({
            data: { 
                businessName: businessName || 'Biashara Yangu', 
                fullName: fullName || 'Mtumiaji', 
                phone, 
                password: hashedPassword, 
                walletBalance: 0.0,
                createdAt: new Date()
            }
        });

        console.log(`\n🎊 [MTEJA MPYA] -> Jina: ${businessName} | Namba: +${phone}`);
        res.status(201).json({ success: true, message: "Usajili umekamilika! Unaweza kuingia sasa." });
    } catch (error) { 
        console.error("❌ [Register Error]:", error.message);
        res.status(500).json({ success: false, error: "Hitilafu imetokea wakati wa usajili. Jaribu tena." }); 
    }
});

// 4.2: LOGIN YA KAWAIDA
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        if (!phone || !password) {
            return res.status(400).json({ success: false, error: "Namba ya simu na nenosiri ni lazima." });
        }

        const business = await prisma.business.findFirst({ where: { phone } });
        
        if (!business) {
            return res.status(401).json({ success: false, error: "Namba hii haijasajiliwa kwenye mfumo." });
        }

        // Kama hana password (aliingia kwa Facebook pekee)
        if (!business.password) {
            return res.status(401).json({ 
                success: false, 
                error: "Akaunti hii iliunganishwa kupitia Facebook. Tafadhali tumia kitufe cha 'Endelea na Facebook'." 
            });
        }

        const isMatch = await bcrypt.compare(password, business.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: "Nenosiri sio sahihi. Tafadhali jaribu tena." });
        }

        const token = jwt.sign({ businessId: business.id }, JWT_SECRET, { expiresIn: '7d' });
        console.log(`🔓 [LOGIN SUCCESS] -> ${business.businessName} ameingia kwenye mfumo.`);
        
        res.status(200).json({ 
            success: true, 
            token, 
            user: { 
                id: business.id, 
                businessName: business.businessName, 
                fullName: business.fullName, 
                phone: business.phone, 
                walletBalance: business.walletBalance, 
                whatsappPhoneId: business.whatsappPhoneId, 
                wabaId: business.wabaId,
                isFacebookConnected: !!business.facebookId
            } 
        });
    } catch (error) { 
        console.error("❌ [Login Error]:", error.message);
        res.status(500).json({ success: false, error: "Hitilafu kwenye Server wakati wa kuingia." }); 
    }
});

// 🔥 4.3: FACEBOOK LOGIN (PRODUCTION READY - NO isActive, NO lastFacebookLogin) 🔥
app.post('/api/auth/facebook-login', authLimiter, async (req, res) => {
    try {
        const { accessToken: codeOrToken } = req.body;
        if (!codeOrToken) {
            return res.status(400).json({ success: false, error: "Access Token au Code inahitajika kutoka Meta." });
        }

        let finalToken = codeOrToken;

        // Kubadili Code kuwa Access Token kama haijaanza na 'EAA'
        if (!codeOrToken.startsWith('EAA')) {
            console.log(`🔄 [META AUTH] Kubadili Code kuwa Access Token...`);
            try {
                const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${codeOrToken}`;
                const tokenRes = await axios.get(tokenUrl, { timeout: 10000 });
                finalToken = tokenRes.data.access_token;
                console.log(`✅ Code imebadilishwa kuwa Token kikamilifu.`);
            } catch (error) {
                console.error("❌ Imeshindwa kubadili code:", error.response?.data || error.message);
                return res.status(400).json({ success: false, error: "Imeshindwa kubadilisha code ya Meta kuwa token. Jaribu tena." });
            }
        }

        // 🔒 Thibitisha token ya mteja ni halali
        let fbUser;
        try {
            fbUser = await verifyCustomerToken(finalToken);
        } catch (error) {
            return res.status(401).json({ success: false, error: "Imeshindwa kuthibitisha akaunti yako ya Facebook. Tafadhali jaribu tena." });
        }

        console.log(`✅ [META VERIFIED] Mtumiaji: ${fbUser.name} (Facebook ID: ${fbUser.id})`);

        let wabaId = null;
        let phoneId = null;

        // 2A: TAFUTA WABA ID KUPITIA DEBUG TOKEN
        try {
            console.log("🔍 [META] Kutafuta WABA ID kupitia Debug Token...");
            const debugUrl = `https://graph.facebook.com/v20.0/debug_token?input_token=${finalToken}&access_token=${META_APP_ID}%7C${META_APP_SECRET}`;
            const debugRes = await axios.get(debugUrl, { timeout: 10000 });
            const scopes = debugRes.data?.data?.granular_scopes || [];
            
            const wabaScope = scopes.find(s => s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging');
            if (wabaScope && wabaScope.target_ids?.length > 0) {
                wabaId = wabaScope.target_ids[0];
                console.log(`✅ WABA ID Imepatikana kupitia Debug Token: ${wabaId}`);
            } else {
                console.log("⚠️ Debug Token haikuonyesha WABA target_ids. Ruhusa za WhatsApp huenda hazijatolewa.");
            }
        } catch(e) {
            console.log("⚠️ Imeshindwa kusoma Debug Token:", e.response?.data?.error?.message || e.message);
        }

        // 2B: NJIA MBADALA - TAFUTA KUPITIA BUSINESSES
        if (!wabaId) {
            try {
                console.log("🔍 [META] Kutafuta WABA ID kupitia Business Profile (Njia Mbadala)...");
                const bizRes = await axios.get(`https://graph.facebook.com/v20.0/me/businesses?access_token=${finalToken}`, { timeout: 10000 });
                const businesses = bizRes.data?.data || [];
                
                console.log(`   └─ Biashara zilizopatikana: ${businesses.length}`);
                
                for (let b of businesses) {
                    try {
                        // Jaribu owned WABA
                        const wabaRes = await axios.get(`https://graph.facebook.com/v20.0/${b.id}/owned_whatsapp_business_accounts?access_token=${finalToken}`, { timeout: 10000 });
                        if (wabaRes.data?.data?.length > 0) {
                            wabaId = wabaRes.data.data[0].id;
                            console.log(`✅ WABA ID Imepatikana (Owned) kutoka kwa ${b.name}: ${wabaId}`);
                            break;
                        }

                        // Jaribu client WABA
                        const clientWabaRes = await axios.get(`https://graph.facebook.com/v20.0/${b.id}/client_whatsapp_business_accounts?access_token=${finalToken}`, { timeout: 10000 });
                        if (clientWabaRes.data?.data?.length > 0) {
                            wabaId = clientWabaRes.data.data[0].id;
                            console.log(`✅ WABA ID Imepatikana (Client) kutoka kwa ${b.name}: ${wabaId}`);
                            break;
                        }
                    } catch(err) {
                        // Endelea na business inayofuata
                        continue;
                    }
                }
                
                if (!wabaId) {
                    console.log("⚠️ Hakuna WABA iliyopatikana. Mteja anahitaji kuwa na WhatsApp Business Account iliyounganishwa na Business Manager yake.");
                }
            } catch(e) {
                console.log("⚠️ Imeshindwa kusoma Business Profile:", e.response?.data?.error?.message || e.message);
            }
        }

        // 2C: VUTA PHONE ID KAMA TUNA WABA ID
        if (wabaId) {
            try {
                console.log("🔍 [META] Kutafuta Phone ID kutoka kwenye WABA...");
                const phoneRes = await axios.get(`https://graph.facebook.com/v20.0/${wabaId}/phone_numbers?access_token=${finalToken}`, { timeout: 10000 });
                if (phoneRes.data?.data?.length > 0) {
                    phoneId = phoneRes.data.data[0].id;
                    console.log(`✅ Phone ID imepatikana: ${phoneId}`);
                } else {
                    console.log("⚠️ WABA ipo lakini hakuna namba ya simu iliyounganishwa. Mteja anatakiwa kuverify namba yake kwenye Meta Business Suite.");
                }
            } catch(e) {
                console.log("⚠️ Hitilafu kuvuta Phone ID:", e.response?.data?.error?.message || e.message);
            }
        } else {
            console.log("⚠️ [ONYO] WABA ID haijapatikana. Mteja ataingia Dashboard lakini ataona Setup Warning.");
        }

        // 3. Mtafute au Mtengeneze Mteja kwenye Database
        // 🔥 HAKUNA 'isActive' - IMETOLEWA KABISA 🔥
        let business = await prisma.business.findUnique({ where: { facebookId: fbUser.id } });

        if (!business) {
            // 🔥 MTEJA MPYA - Safi kabisa, hakuna isActive wala lastFacebookLogin 🔥
            console.log(`\n🎉 [MTEJA MPYA SAAS (META)] Inaunda akaunti mpya...`);
            
            const createData = {
                businessName: `${fbUser.name} Business`,
                fullName: fbUser.name,
                facebookId: fbUser.id,
                metaAccessToken: finalToken,
                walletBalance: 0.0,
                createdAt: new Date()
            };
            
            // Ongeza WABA na Phone ID kama zipo tu (zinaweza kuwa null)
            if (wabaId) createData.wabaId = wabaId;
            if (phoneId) createData.whatsappPhoneId = phoneId;
            
            business = await prisma.business.create({ data: createData });
            
            console.log(`   ├─ Jina la Biashara: ${business.businessName}`);
            console.log(`   ├─ Facebook ID: ${fbUser.id}`);
            console.log(`   ├─ WABA ID: ${wabaId || '❌ Haijapatikana (Mteja ataona Setup Warning kwenye Dashboard)'}`);
            console.log(`   ├─ Phone ID: ${phoneId || '❌ Haijapatikana'}`);
            console.log(`   └─ Token ya Mteja: Imehifadhiwa kwa usalama (haitumiki kutuma ujumbe) ✅\n`);
        } else {
            // 🔥 MTEJA ANARUDIA - Sasisha tu data zilizopo 🔥
            console.log(`🔓 [META LOGIN] ${business.businessName} anarejea ofisini...`);
            
            const updateData = { 
                metaAccessToken: finalToken
            };
            
            // Sasisha WABA na Phone ID kama zimepatikana (USIZIFUTE kama hazipo)
            if (wabaId) updateData.wabaId = wabaId;
            if (phoneId) updateData.whatsappPhoneId = phoneId;
            
            business = await prisma.business.update({
                where: { id: business.id },
                data: updateData
            });
            
            console.log(`   ├─ WABA ID: ${business.wabaId || 'Bado haijapatikana'}`);
            console.log(`   ├─ Phone ID: ${business.whatsappPhoneId || 'Bado haijapatikana'}`);
            console.log(`   └─ Token ya Mteja: Imesasishwa kwa usalama ✅`);
        }

        const token = jwt.sign({ businessId: business.id }, JWT_SECRET, { expiresIn: '7d' });
        
        // 🔥 Rudi response hata kama WABA/Phone ID ni null - Dashboard itaonyesha warning 🔥
        res.status(200).json({ 
            success: true, 
            token, 
            user: { 
                id: business.id, 
                businessName: business.businessName, 
                fullName: business.fullName, 
                walletBalance: business.walletBalance, 
                whatsappPhoneId: business.whatsappPhoneId,
                wabaId: business.wabaId,
                isFacebookConnected: true
            } 
        });

    } catch (error) {
        console.error("\n❌ [META API ERROR] Imetokea hitilafu kubwa:");
        console.error("   ├─ Message:", error.message);
        if (error.response?.data) {
            console.error("   └─ Meta Response:", JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).json({ 
            success: false, 
            error: "Imeshindwa kuwasiliana na seva za Meta. Hakikisha akaunti yako ina Business Manager na WhatsApp Business Account iliyounganishwa." 
        });
    }
});

// ==========================================
// ⚙️ 5. MIPANGILIO YA PHONE ID (LOCK SECURITY)
// ==========================================
app.post('/api/settings/update', verifyToken, async (req, res) => {
    try {
        const { whatsappPhoneId } = req.body;
        
        if (!whatsappPhoneId || !whatsappPhoneId.trim()) {
            return res.status(400).json({ success: false, error: "Phone ID inahitajika." });
        }

        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        
        if (!business) {
            return res.status(404).json({ success: false, error: "Biashara haijapatikana." });
        }
        
        if (business.whatsappPhoneId && business.whatsappPhoneId !== whatsappPhoneId.trim()) {
            console.log(`\n🔒 [ULINZI MKALI] ${business.businessName} amejaribu kubadili Phone ID isivyo halali.`);
            return res.status(400).json({ success: false, error: "Namba hii tayari imesajiliwa na imefungwa. Wasiliana na KEDESH Admin kuibadili." });
        }

        await prisma.business.update({ 
            where: { id: req.user.businessId }, 
            data: { whatsappPhoneId: whatsappPhoneId.trim() } 
        });
        
        console.log(`\n🛡️ [PHONE ID ILIYOFUNGWA] ${business.businessName} -> Namba MPYA: ${whatsappPhoneId.trim()}`);
        res.status(200).json({ success: true, message: "Namba ya Phone ID imeunganishwa kikamilifu!" });
    } catch (error) { 
        console.error("❌ [Settings Error]:", error.message);
        res.status(500).json({ success: false, error: "Hitilafu imetokea kwenye mfumo." }); 
    }
});

// ==========================================
// 📡 6. KUTHIBITISHA & KUPOKEA WEBHOOK (META)
// ==========================================
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode']; 
    const token = req.query['hub.verify_token']; 
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
        console.log(`\n🟢 [WEBHOOK] Imethibitishwa na Meta Kikamilifu!`);
        return res.status(200).send(challenge);
    }
    
    console.log(`\n🔴 [WEBHOOK] Jaribio lisilo halali la uthibitisho. Token iliyotumwa: ${token}`);
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    // Tunajibu Meta haraka kabla ya kuanza processing
    res.sendStatus(200); 
    
    try {
        const body = req.body;
        if (body?.object !== 'whatsapp_business_account') return;

        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                const value = change.value;
                if (!value) continue;

                const incomingPhoneId = value.metadata?.phone_number_id;
                if (!incomingPhoneId) continue;

                const business = await prisma.business.findFirst({ where: { whatsappPhoneId: incomingPhoneId } });
                
                if (!business) {
                    console.log(`⚠️ [WEBHOOK] Hakuna biashara yenye Phone ID: ${incomingPhoneId}`);
                    continue;
                }

                // A) KUKAMATA TIKI ZA WHATSAPP (MESSAGE STATUS UPDATES)
                if (value.statuses?.length > 0) {
                    for (const statusObj of value.statuses) {
                        const newStatus = statusObj.status.toUpperCase(); 
                        
                        await prisma.message.updateMany({ 
                            where: { metaMsgId: statusObj.id }, 
                            data: { status: newStatus }
                        });
                        
                        io.to(business.id).emit('messageStatusUpdate', {
                            metaMsgId: statusObj.id,
                            status: newStatus,
                            timestamp: statusObj.timestamp
                        });

                        const tickIcon = newStatus === 'READ' ? '🔵' : 
                                        newStatus === 'DELIVERED' ? '🔘' : 
                                        newStatus === 'SENT' ? '⚪' : '❌';
                        
                        console.log(`   ${tickIcon} [TIKI LIVE] -> ${business.businessName} | Status: ${newStatus}`);
                    }
                }

                // B) KUKAMATA MESEJI MPYA INAYOINGIA
                if (value.messages?.length > 0) {
                    for (const message of value.messages) {
                        const phoneNumber = message.from;
                        const customerName = value.contacts?.[0]?.profile?.name || phoneNumber;
                        
                        let msgBody = "";
                        if (message.type === 'text') {
                            msgBody = message.text.body;
                        } else if (message.type === 'button') {
                            msgBody = message.button?.text || "[Amebofya Kitufe]";
                        } else if (message.type === 'interactive') {
                            msgBody = message.interactive?.button_reply?.title || 
                                     message.interactive?.list_reply?.title || 
                                     "[Mwitikio]";
                        } else {
                            msgBody = `📎 [Faili/Interactive: ${message.type}]`;
                        }

                        let dbContact = await prisma.contact.findFirst({ 
                            where: { businessId: business.id, phoneNumber: phoneNumber } 
                        });
                        
                        if (!dbContact) {
                            dbContact = await prisma.contact.create({ 
                                data: { businessId: business.id, phoneNumber, name: customerName } 
                            });
                        }

                        const existingMsg = await prisma.message.findFirst({ where: { metaMsgId: message.id } });
                        
                        if (!existingMsg) {
                            const newMsg = await prisma.message.create({
                                data: { 
                                    businessId: business.id, 
                                    contactId: dbContact.id, 
                                    metaMsgId: message.id, 
                                    direction: 'INBOUND', 
                                    content: msgBody, 
                                    status: 'RECEIVED',
                                    messageType: message.type
                                }
                            });

                            console.log(`\n┌───────────────────────────────────────────────────────┐`);
                            console.log(`│ 📥 [INBOX MPYA] KUTOKA: ${customerName} (+${phoneNumber})`);
                            console.log(`│ 🏢 KWENDA KWA: ${business.businessName}`);
                            console.log(`│ 💬 UJUMBE: "${msgBody.substring(0, 50)}${msgBody.length > 50 ? '...' : ''}"`);
                            console.log(`└───────────────────────────────────────────────────────┘\n`);

                            io.to(business.id).emit('newIncomingMessage', {
                                contactId: dbContact.id,
                                contactName: customerName,
                                phoneNumber: phoneNumber,
                                message: {
                                    id: newMsg.id,
                                    content: newMsg.content,
                                    direction: newMsg.direction,
                                    status: newMsg.status,
                                    createdAt: newMsg.createdAt
                                }
                            });
                        }
                    }
                }
            }
        }
    } catch (error) { 
        console.error("❌ [Webhook Error]:", error.message); 
    }
});

// ==========================================
// 📱 7. API ZA FRONTEND LIVE CHAT 
// ==========================================
app.get('/api/chat/contacts', verifyToken, async (req, res) => {
    try {
        const contacts = await prisma.contact.findMany({ 
            where: { businessId: req.user.businessId }, 
            include: { 
                messages: { 
                    orderBy: { createdAt: 'desc' }, 
                    take: 1 
                } 
            } 
        });
        
        const formattedContacts = await Promise.all(
            contacts.filter(c => c.messages.length > 0).map(async c => {
                const unreadCount = await prisma.message.count({ 
                    where: { contactId: c.id, direction: 'INBOUND', status: 'RECEIVED' } 
                });
                
                return {
                    id: c.id, 
                    name: c.name || c.phoneNumber, 
                    phone: c.phoneNumber, 
                    lastMsg: c.messages[0]?.content || "...", 
                    time: c.messages[0]?.createdAt, 
                    unread: unreadCount, 
                    lastSender: c.messages[0]?.direction === 'OUTBOUND' ? 'me' : 'them', 
                    lastStatus: c.messages[0]?.status
                };
            })
        );
        
        formattedContacts.sort((a, b) => new Date(b.time) - new Date(a.time));
        res.status(200).json({ success: true, contacts: formattedContacts });
    } catch (error) { 
        console.error("❌ [Contacts Error]:", error.message);
        res.status(500).json({ error: error.message }); 
    }
});

app.get('/api/chat/messages/:contactId', verifyToken, async (req, res) => {
    try {
        // Mark messages as READ
        await prisma.message.updateMany({ 
            where: { 
                contactId: req.params.contactId, 
                businessId: req.user.businessId, 
                direction: 'INBOUND', 
                status: 'RECEIVED' 
            }, 
            data: { status: 'READ' } 
        });
        
        const messages = await prisma.message.findMany({ 
            where: { 
                contactId: req.params.contactId, 
                businessId: req.user.businessId 
            }, 
            orderBy: { createdAt: 'asc' } 
        });
        
        res.status(200).json({ 
            success: true, 
            messages: messages.map(m => ({ 
                id: m.id, 
                content: m.content, 
                direction: m.direction, 
                status: m.status, 
                createdAt: m.createdAt 
            })) 
        });
    } catch (error) { 
        console.error("❌ [Messages Error]:", error.message);
        res.status(500).json({ error: error.message }); 
    }
});

app.post('/api/chat/send', verifyToken, async (req, res) => {
    try {
        const { contactId, phone, messageText } = req.body;
        
        if (!phone || !messageText || !contactId) {
            return res.status(400).json({ success: false, error: "Taarifa za meseji hazijakamilika." });
        }
        
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });

        if (!business) {
            return res.status(404).json({ success: false, error: "Akaunti yako haijapatikana." });
        }

        const phoneIdToUse = business.whatsappPhoneId;
        if (!phoneIdToUse) {
            return res.status(403).json({ 
                success: false, 
                error: "Hujaunganishwa Phone ID yako. Tafadhali kamilisha usajili wa Meta kwanza." 
            });
        }
        
        if (business.walletBalance < LIVE_CHAT_COST) {
            return res.status(402).json({ 
                success: false, 
                error: `Salio lako halitoshi. Unahitaji TZS ${LIVE_CHAT_COST} kujibu. Salio lako sasa: TZS ${business.walletBalance}` 
            });
        }

        const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, messageText, 'text');

        const [newMessage, updatedBiz] = await prisma.$transaction([
            prisma.message.create({ 
                data: { 
                    businessId: business.id, 
                    contactId, 
                    metaMsgId: metaRes.data.messages[0].id, 
                    direction: 'OUTBOUND', 
                    content: messageText, 
                    status: 'SENT',
                    messageType: 'text'
                } 
            }),
            prisma.business.update({ 
                where: { id: business.id }, 
                data: { walletBalance: { decrement: LIVE_CHAT_COST } } 
            })
        ]);

        console.log(`\n💬 [LIVE CHAT] ${business.businessName} -> Mteja: +${phone}`);
        console.log(`   ├─ Ujumbe: "${messageText.substring(0, 30)}..."`);
        console.log(`   ├─ Makato: TZS ${LIVE_CHAT_COST}`);
        console.log(`   └─ Salio Jipya: TZS ${updatedBiz.walletBalance}\n`);
        
        io.to(business.id).emit('newIncomingMessage', {
             contactId: contactId,
             contactName: "You",
             phoneNumber: phone,
             message: {
                 id: newMessage.id,
                 content: newMessage.content,
                 direction: newMessage.direction,
                 status: newMessage.status,
                 createdAt: newMessage.createdAt
             }
        });

        io.to(business.id).emit('walletUpdate', {
            newBalance: updatedBiz.walletBalance
        });

        res.status(200).json({ 
            success: true, 
            message: "Imetumwa", 
            newBalance: updatedBiz.walletBalance, 
            newMsg: {
                id: newMessage.id,
                content: newMessage.content,
                status: newMessage.status,
                createdAt: newMessage.createdAt
            }
        });
    } catch (error) { 
        console.error("❌ [Send Message Error]:", error.response?.data || error.message);
        
        const errorMsg = error.response?.data?.error?.message || "";
        const errorCode = error.response?.data?.error?.code;

        if (errorMsg.includes('24 hour') || errorMsg.includes('outside the allowed') || errorCode === 131047) {
            return res.status(400).json({ 
                success: false, 
                error: "Masaa 24 yameisha tangu mteja huyu atume meseji. Kisheria, huwezi kutuma ujumbe wa kawaida hapa. Tumia Template kuanzisha mazungumzo." 
            });
        }
        
        if (errorMsg.includes('access token') || errorMsg.includes('authorization') || errorCode === 190) {
            return res.status(401).json({ 
                success: false, 
                error: "Hitilafu ya uthibitisho na Meta. Wasiliana na admin wa mfumo." 
            });
        }
        
        res.status(500).json({ success: false, error: "Imeshindikana kutuma meseji. Jaribu tena." }); 
    }
});

// ==========================================
// 🚀 8. BULK SMS ENGINE (MAKATO TZS 84) 🔥
// ==========================================
app.post('/api/send-bulk', verifyToken, async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { contacts, campaignName, templateName, templateLanguage, headerImageUrl } = req.body; 
        
        if (!contacts || contacts.length === 0) {
            return res.status(400).json({ success: false, error: "Namba za wateja hazipo." });
        }

        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        
        if (!business) {
            return res.status(404).json({ success: false, error: "Akaunti yako haijapatikana." });
        }
        
        const phoneIdToUse = business.whatsappPhoneId;
        if (!phoneIdToUse) {
            return res.status(403).json({ 
                success: false, 
                error: "Akaunti yako haijaunganishwa Phone ID. Tafadhali kamilisha usajili wa Meta kwanza." 
            });
        }
        
        const totalEstimatedCost = contacts.length * BULK_SMS_COST;
        if (business.walletBalance < totalEstimatedCost) {
            return res.status(402).json({ 
                success: false, 
                error: `Salio halitoshi. Unahitaji TZS ${totalEstimatedCost} kwa wateja ${contacts.length}. Salio lako sasa: TZS ${business.walletBalance}` 
            });
        }

        // 🔥 PRO-LEVEL LOGGING - KAMPENI KAMILI 🔥
        console.log(`\n┏━━━━━━━━━━━━━━━━ 🚀 KAMPENI MPYA INAANZA ━━━━━━━━━━━━━━━━┓`);
        console.log(`┃ BIASHARA    : ${business.businessName}`);
        console.log(`┃ WATEJA      : ${contacts.length}`);
        console.log(`┃ TEMPLATE    : ${templateName || 'hello_world'} (${templateLanguage || 'sw'})`);
        console.log(`┃ PICHA       : ${headerImageUrl ? '✅ Ipo' : '❌ Hakuna'}`);
        console.log(`┃ GHARAMA/JUM : TZS ${BULK_SMS_COST}`);
        console.log(`┃ GHARAMA KML : TZS ${totalEstimatedCost}`);
        console.log(`┃ SALIO AWALI : TZS ${business.walletBalance}`);
        console.log(`┃ TOKEN       : ADMIN (Kedesh Limited) 🔑`);
        console.log(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`);
        console.log(`⏳ Inatuma ujumbe kwa wateja ${contacts.length}...\n`);
        
        let successCount = 0; 
        let failedCount = 0; 
        let failedNumbers = [];
        let batchNumber = 0;

        for (let i = 0; i < contacts.length; i++) {
            const phone = contacts[i];
            try {
                let templatePayload = { 
                    name: templateName || "hello_world", 
                    language: { code: templateLanguage || "sw" } 
                };

                if (headerImageUrl && headerImageUrl.trim() !== '') {
                    templatePayload.components = [{ 
                        type: "header", 
                        parameters: [{ type: "image", image: { link: headerImageUrl.trim() } }] 
                    }];
                }

                const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, templatePayload, 'template');
                
                successCount++;
                const metaMsgId = metaRes.data.messages[0].id;
                
                // Log kwa kila batch ya 50
                if (successCount % 50 === 0 || successCount === 1) {
                    batchNumber++;
                    const progress = ((i + 1) / contacts.length * 100).toFixed(1);
                    console.log(`   📦 Batch #${batchNumber} | Zimetumwa: ${successCount} | Progress: ${progress}%`);
                }

                process.stdout.write(`✅ `);

                let dbContact = await prisma.contact.findFirst({ 
                    where: { businessId: business.id, phoneNumber: phone } 
                });
                
                if (!dbContact) {
                    dbContact = await prisma.contact.create({ 
                        data: { businessId: business.id, phoneNumber: phone, name: phone } 
                    });
                }

                await prisma.message.create({
                    data: { 
                        businessId: business.id, 
                        contactId: dbContact.id, 
                        metaMsgId: metaMsgId, 
                        direction: 'OUTBOUND', 
                        content: `📢 [${campaignName || 'Kampeni'}] - Template: ${templateName}`, 
                        status: 'SENT',
                        messageType: 'template'
                    }
                });

                await new Promise(resolve => setTimeout(resolve, 300)); 
                
            } catch (error) {
                failedCount++;
                const metaError = error.response?.data?.error?.message || error.message;
                process.stdout.write(`❌ `);
                failedNumbers.push({ 
                    phone, 
                    reason: metaError.substring(0, 80),
                    code: error.response?.data?.error?.code || 'UNKNOWN'
                });
                
                // Log kosa kubwa
                if (error.response?.data?.error?.code === 190 || metaError.includes('access token')) {
                    console.error(`\n⚠️ [TOKEN ERROR] Token ya Admin imekwisha au si halali! Acha kutuma.`);
                    break;
                }
            }
        }

        const actualCost = successCount * BULK_SMS_COST;
        let newBalance = business.walletBalance;
        
        if (actualCost > 0) {
            const updatedBiz = await prisma.business.update({ 
                where: { id: business.id }, 
                data: { walletBalance: { decrement: actualCost } } 
            });
            newBalance = updatedBiz.walletBalance;
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        // 🔥 RIPOTI YA MWISHO - PRO LEVEL 🔥
        console.log(`\n`);
        console.log(`╔════════════════ 🏁 KAMPENI IMEKAMILIKA ════════════════╗`);
        console.log(`║ 📊 MUHTASARI WA KAMPENI:`);
        console.log(`║    ✅ Zilizofika   : ${successCount}/${contacts.length} (${((successCount/contacts.length)*100).toFixed(1)}%)`);
        console.log(`║    ❌ Zilizofeli   : ${failedCount}`);
        console.log(`║    💰 Gharama      : TZS ${actualCost} (TZS ${BULK_SMS_COST} x ${successCount})`);
        console.log(`║    🏦 Salio Awali  : TZS ${business.walletBalance}`);
        console.log(`║    🏦 Salio Mpya   : TZS ${newBalance}`);
        console.log(`║    ⏱️  Muda         : Sekunde ${duration}`);
        console.log(`╚════════════════════════════════════════════════════════╝\n`);
        
        // Log failed numbers kama zipo
        if (failedNumbers.length > 0) {
            console.log(`📋 NAMBA ZILIZOFELI (${failedNumbers.length}):`);
            failedNumbers.slice(0, 5).forEach(f => {
                console.log(`   ❌ +${f.phone} -> ${f.reason}`);
            });
            if (failedNumbers.length > 5) {
                console.log(`   ... na nyingine ${failedNumbers.length - 5}`);
            }
            console.log(``);
        }

        io.to(business.id).emit('campaignComplete', {
            campaignName: campaignName || 'Kampeni',
            stats: {
                total: contacts.length,
                success: successCount,
                failed: failedCount,
                duration: duration
            },
            newBalance: newBalance
        });

        return res.status(200).json({ 
            success: true, 
            message: `Kampeni imekamilika. ${successCount}/${contacts.length} zimefika. Muda: ${duration}s`,
            stats: { 
                total: contacts.length, 
                success: successCount, 
                failed: failedCount,
                duration: duration
            }, 
            newBalance,
            failedNumbers: failedNumbers.slice(0, 10)
        });
        
    } catch (error) { 
        console.error("❌ [Bulk SMS Fatal Error]:", error.message);
        return res.status(500).json({ 
            success: false, 
            error: "Hitilafu imetokea kwenye Server wakati wa kutuma Bulk SMS." 
        }); 
    }
});

// ==========================================
// 🏠 9. ROOT ENDPOINT (HEALTH CHECK)
// ==========================================
app.get('/', (req, res) => { 
    res.status(200).json({ 
        status: "Online 🟢", 
        sockets: "Active 🔌", 
        architecture: "Hybrid Multi-Tenant (Admin Token for Sending, Customer Token for Auth)",
        version: "2.2.0",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    }); 
});

// ==========================================
// 🚦 10. GLOBAL ERROR HANDLING MIDDLEWARE
// ==========================================
app.use((err, req, res, next) => {
    console.error("🚨 [UNHANDLED ERROR]:", err.stack || err.message);
    
    // Epuka kutuma error kama headers tayari zimetumwa
    if (res.headersSent) {
        return next(err);
    }
    
    res.status(500).json({ 
        success: false, 
        error: "Hitilafu isiyotarajiwa imetokea. Tafadhali jaribu tena baadaye.",
        reference: Date.now()
    });
});

// ==========================================
// 🚀 11. START SERVER
// ==========================================
server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(` 🚀 KEDESH SAAS BACKEND v2.2.0 IMESIMAMA IMARA `);
    console.log(`=============================================================`);
    console.log(` 🟢 PORT          : ${PORT}`);
    console.log(` 🏢 MUUNDO        : Hybrid Multi-Tenant (Tech Provider Model)`);
    console.log(` 🔑 MFUMO         : Admin Token Inatumwa - Mteja Anakaguliwa Salio`);
    console.log(` 💰 LIVE CHAT     : TZS ${LIVE_CHAT_COST}/ujumbe`);
    console.log(` 💰 BULK SMS      : TZS ${BULK_SMS_COST}/ujumbe`);
    console.log(` ⚡ SOCKET.IO     : Ipo Hewani, Inasukuma SMS & Tiki LIVE!`);
    console.log(` 🛡️ ULINZI        : Wallet Check + Rate Limiting + Helmet`);
    console.log(` 📡 WEBHOOK       : Imejikita kwa META_VERIFY_TOKEN`);
    console.log(` 📝 CHANGELOG     : v2.2.0 - No isActive, No lastFacebookLogin, Pro Logging, Global Error Handler`);
    console.log(`=============================================================\n`);
});

// ==========================================
// 🛑 GRACEFUL SHUTDOWN
// ==========================================
const gracefulShutdown = async (signal) => {
    console.log(`\n⚠️ ${signal} imepokelewa. Inazima server kwa utaratibu...`);
    
    server.close(async () => {
        console.log('📴 HTTP server imezimwa.');
        await prisma.$disconnect();
        console.log('📴 Database connection imefungwa.');
        process.exit(0);
    });
    
    // Force shutdown baada ya sekunde 10
    setTimeout(() => {
        console.error('⏰ Shutdown forced after 10s.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 [UNHANDLED REJECTION]:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('🚨 [UNCAUGHT EXCEPTION]:', error);
    process.exit(1);
});