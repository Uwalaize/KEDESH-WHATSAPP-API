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
    cors: { origin: '*', methods: ['GET', 'POST'] } 
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

app.use(helmet()); 
app.use(cors()); 
app.use(express.json({ limit: '5mb' })); 

const apiLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 150, standardHeaders: true, legacyHeaders: false });
app.use('/api/', apiLimiter); 

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, error: "Umejaribu mara nyingi mno. Subiri dakika 15." } });

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ success: false, error: "Huruhusiwi, Tiketi inahitajika." });
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ success: false, error: "Tiketi imekwisha muda wake. Ingia upya kwenye mfumo." });
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
            'Authorization': `Bearer ${adminToken}`, // Token ya Admin (Kedesh)
            'Content-Type': 'application/json' 
        },
        data: {
            messaging_product: "whatsapp",
            to: phone,
            type: type,
            ...(type === 'text' ? { text: { body: payload } } : { template: payload })
        }
    });
};

/**
 * 🔒 FUNCTION YA KUTHIBITISHA TOKEN YA MTEJA (KWA LOGIN TU)
 * Hii inatumika tu wakati wa Facebook Login kuthibitisha mteja ni halali
 * HAITUMIKI kutuma ujumbe - ni kwa ajili ya uthibitisho tu
 */
const verifyCustomerToken = async (customerToken) => {
    try {
        const response = await axios.get(`https://graph.facebook.com/me?fields=id,name&access_token=${customerToken}`);
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
        const totalSent = await prisma.message.count({ where: { businessId, direction: 'OUTBOUND' } });
        const totalDelivered = await prisma.message.count({ where: { businessId, direction: 'OUTBOUND', status: { in: ['DELIVERED', 'READ'] } } });
        const totalContacts = await prisma.contact.count({ where: { businessId } });
        const totalFailed = await prisma.message.count({ where: { businessId, direction: 'OUTBOUND', status: 'FAILED' } });

        // Takwimu za kifedha
        const totalSpent = (totalSent * LIVE_CHAT_COST) || 0; // Approximate - unaweza kuwa na field maalum
        const walletBalance = (await prisma.business.findUnique({ where: { id: businessId }, select: { walletBalance: true } }))?.walletBalance || 0;

        res.status(200).json({ 
            success: true, 
            stats: { 
                totalContacts, 
                totalSent, 
                totalDelivered, 
                totalFailed,
                walletBalance,
                totalSpent 
            } 
        });
    } catch (error) { 
        console.error("Stats Error:", error);
        res.status(500).json({ success: false, error: "Imeshindwa kuvuta takwimu." }); 
    }
});

// ==========================================
// 💰 3B. API YA KUTAZAMA SALIO NA TRANSACTIONS
// ==========================================
app.get('/api/wallet/balance', verifyToken, async (req, res) => {
    try {
        const business = await prisma.business.findUnique({ 
            where: { id: req.user.businessId },
            select: { walletBalance: true, businessName: true }
        });
        
        res.status(200).json({ 
            success: true, 
            walletBalance: business.walletBalance,
            businessName: business.businessName
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Imeshindwa kuvuta salio." });
    }
});

// ==========================================
// 🔐 4. API ZA AUTHENTICATION (REGISTER, LOGIN, FB)
// ==========================================

// 4.1: USAJILI WA KAWAIDA
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { businessName, fullName, phone, password } = req.body;
        
        if(!phone || !password) return res.status(400).json({ success: false, error: "Namba ya simu na nenosiri ni lazima." });

        const existingBusiness = await prisma.business.findFirst({ where: { phone } });
        if (existingBusiness) return res.status(400).json({ success: false, error: "Namba hii tayari imeshasajiliwa. Tafadhali ingia." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await prisma.business.create({
            data: { 
                businessName, 
                fullName, 
                phone, 
                password: hashedPassword, 
                walletBalance: 0.0,
                isActive: true,
                createdAt: new Date()
            }
        });

        console.log(`\n🎊 [MTEJA MPYA SAAS] -> Jina: ${businessName} | Namba: +${phone}`);
        res.status(201).json({ success: true, message: "Usajili umekamilika kikamilifu!" });
    } catch (error) { 
        console.error("Register Error:", error);
        res.status(500).json({ success: false, error: "Hitilafu imetokea kwenye Server. Jaribu tena." }); 
    }
});

// 4.2: LOGIN YA KAWAIDA
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { phone, password } = req.body;
        const business = await prisma.business.findFirst({ where: { phone } });
        
        if (!business) {
            return res.status(401).json({ success: false, error: "Namba hii haijasajiliwa kwenye mfumo." });
        }

        if (!business.isActive) {
            return res.status(403).json({ success: false, error: "Akaunti yako imesitishwa. Wasiliana na admin." });
        }

        if (!business.password) {
            return res.status(401).json({ success: false, error: "Akaunti hii iliunganishwa kupitia Facebook. Tafadhali tumia kitufe cha 'Endelea na Facebook'." });
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
        console.error("Login Error:", error);
        res.status(500).json({ success: false, error: "Hitilafu kwenye Server." }); 
    }
});

// 🔥 4.3: FACEBOOK EMBEDDED SIGNUP WIZARD (META LOGIN) 🔥
app.post('/api/auth/facebook-login', authLimiter, async (req, res) => {
    try {
        const { accessToken: codeOrToken } = req.body;
        if (!codeOrToken) return res.status(400).json({ success: false, error: "Access Token au Code inahitajika kutoka Meta." });

        let finalToken = codeOrToken;

        // Kubadili Code kuwa Access Token kama ipo
        if (!codeOrToken.startsWith('EAA')) {
            console.log(`🔄 [META AUTH] Ninabadili Code iliyopokelewa kuwa Access Token...`);
            const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${codeOrToken}`;
            const tokenRes = await axios.get(tokenUrl);
            finalToken = tokenRes.data.access_token;
        }

        // 🔒 Thibitisha token ya mteja ni halali
        let fbUser;
        try {
            fbUser = await verifyCustomerToken(finalToken);
        } catch (error) {
            return res.status(401).json({ success: false, error: "Imeshindwa kuthibitisha akaunti yako ya Facebook. Tafadhali jaribu tena." });
        }

        console.log(`✅ [META VERIFIED] Mtumiaji: ${fbUser.name} (${fbUser.id})`);

        let wabaId = null;
        let phoneId = null;

        // 2A: TAFUTA WABA ID KUPITIA DEBUG TOKEN (Njia sahihi zaidi ya Meta API v20.0)
        try {
            console.log("🔍 [META] Natafuta WABA ID kupitia Debug Token...");
            const debugUrl = `https://graph.facebook.com/v20.0/debug_token?input_token=${finalToken}&access_token=${META_APP_ID}%7C${META_APP_SECRET}`;
            const debugRes = await axios.get(debugUrl);
            const scopes = debugRes.data?.data?.granular_scopes || [];
            
            const wabaScope = scopes.find(s => s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging');
            if (wabaScope && wabaScope.target_ids?.length > 0) {
                wabaId = wabaScope.target_ids[0];
                console.log(`✅ WABA ID Imepatikana kupitia Debug Token: ${wabaId}`);
            } else {
                console.log("⚠️ Debug Token haikuonyesha 'target_ids' za WABA.");
            }
        } catch(e) {
            console.log("⚠️ Imeshindwa kusoma Debug Token:", e.response?.data || e.message);
        }

        // 2B: KAMA DEBUG TOKEN IMEKOSA, TAFUTA KUPITIA BUSINESS ID (Njia Mbadala)
        if (!wabaId) {
            try {
                console.log("🔍 [META] Natafuta WABA ID kupitia Business Profile...");
                const bizRes = await axios.get(`https://graph.facebook.com/v20.0/me/businesses?access_token=${finalToken}`);
                const businesses = bizRes.data?.data || [];
                
                for (let b of businesses) {
                    try {
                        const wabaRes = await axios.get(`https://graph.facebook.com/v20.0/${b.id}/owned_whatsapp_business_accounts?access_token=${finalToken}`);
                        if (wabaRes.data?.data?.length > 0) {
                            wabaId = wabaRes.data.data[0].id;
                            console.log(`✅ WABA ID Imepatikana kupitia Business (${b.name}): ${wabaId}`);
                            break;
                        }

                        const clientWabaRes = await axios.get(`https://graph.facebook.com/v20.0/${b.id}/client_whatsapp_business_accounts?access_token=${finalToken}`);
                        if (clientWabaRes.data?.data?.length > 0) {
                            wabaId = clientWabaRes.data.data[0].id;
                            console.log(`✅ WABA ID Imepatikana kupitia Client Business (${b.name}): ${wabaId}`);
                            break;
                        }
                    } catch(err) { /* Endelea na biashara inayofuata */ }
                }
            } catch(e) {
                console.log("⚠️ Imeshindwa kusoma Business Profile.");
            }
        }

        // 2C: VUTA PHONE ID KAMA TUNA WABA ID
        if (wabaId) {
            try {
                const phoneRes = await axios.get(`https://graph.facebook.com/v20.0/${wabaId}/phone_numbers?access_token=${finalToken}`);
                if (phoneRes.data?.data?.length > 0) {
                    phoneId = phoneRes.data.data[0].id;
                    console.log(`✅ Namba ya Simu (Phone ID) imepatikana: ${phoneId}`);
                } else {
                    console.log("⚠️ WABA ipo, lakini Namba ya Simu haijapatikana.");
                }
            } catch(e) {
                console.log("⚠️ Hitilafu kuvuta Namba ya Simu kutoka kwenye WABA.");
            }
        } else {
            console.log("❌ WABA ID haijapatikana kabisa. Mteja aliruka hatua au Meta imekataa.");
        }

        // 3. Mtafute au Mtengeneze Mteja kwenye Kanzidata
        let business = await prisma.business.findUnique({ where: { facebookId: fbUser.id } });

        if (!business) {
            // Mteja mpya kabisa
            business = await prisma.business.create({
                data: {
                    businessName: `${fbUser.name} Business`,
                    fullName: fbUser.name,
                    facebookId: fbUser.id,
                    metaAccessToken: finalToken, // 🔒 Hifadhi token yake kwa reference (lakini hatuitumii kutuma)
                    wabaId: wabaId,
                    whatsappPhoneId: phoneId,
                    walletBalance: 0.0,
                    isActive: true,
                    createdAt: new Date(),
                    lastFacebookLogin: new Date()
                }
            });
            console.log(`\n🎉 [MTEJA MPYA SAAS (META)]`);
            console.log(`   ├─ Jina: ${business.businessName}`);
            console.log(`   ├─ Facebook ID: ${fbUser.id}`);
            console.log(`   ├─ WABA: ${wabaId || 'Haijapatikana'}`);
            console.log(`   ├─ Phone ID: ${phoneId || 'Haijapatikana'}`);
            console.log(`   └─ Token ya Mteja: Imehifadhiwa kwa usalama (haitumiki kutuma ujumbe) ✅\n`);
        } else {
            // Mteja anayerejea - sasisha token na IDs
            business = await prisma.business.update({
                where: { id: business.id },
                data: { 
                    metaAccessToken: finalToken, // Sasisha token yake (kwa reference)
                    ...(wabaId && { wabaId }),
                    ...(phoneId && { whatsappPhoneId: phoneId }),
                    lastFacebookLogin: new Date(),
                    isActive: true // Reactivate kama alikuwa amesitishwa
                }
            });
            console.log(`🔓 [META LOGIN SUCCESS] -> ${business.businessName} ameingia ofisini.`);
            console.log(`   ├─ WABA yake: ${business.wabaId || 'Haijapatikana'}`);
            console.log(`   ├─ Phone ID: ${business.whatsappPhoneId || 'Haijapatikana'}`);
            console.log(`   └─ Token ya Mteja: Imesasishwa (haitumiki kutuma ujumbe) ✅`);
        }

        const token = jwt.sign({ businessId: business.id }, JWT_SECRET, { expiresIn: '7d' });
        
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
        console.error("\n❌ [META API ERROR] Imetokea hitilafu kuwasiliana na Meta:");
        console.error(error.response?.data || error.message);
        res.status(500).json({ success: false, error: "Imeshindwa kuwasiliana na seva za Meta. Hakikisha akaunti yako haina shida." });
    }
});

// ==========================================
// ⚙️ 5. MIPANGILIO YA PHONE ID (LOCK SECURITY)
// ==========================================
app.post('/api/settings/update', verifyToken, async (req, res) => {
    try {
        const { whatsappPhoneId } = req.body;
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        
        if(business.whatsappPhoneId && business.whatsappPhoneId !== whatsappPhoneId.trim()) {
            console.log(`\n🔒 [ULINZI MKALI] ${business.businessName} amejaribu kubadili Phone ID isivyo halali.`);
            return res.status(400).json({ success: false, error: "Namba hii tayari imesajiliwa na imefungwa. Wasiliana na KEDESH Admin kuibadili." });
        }

        await prisma.business.update({ where: { id: req.user.businessId }, data: { whatsappPhoneId: whatsappPhoneId.trim() } });
        console.log(`\n🛡️ [PHONE ID ILIYOFUNGWA] ${business.businessName} -> Namba MPYA: ${whatsappPhoneId.trim()}`);
        res.status(200).json({ success: true, message: "Namba ya Phone ID imeunganishwa kikamilifu!" });
    } catch (error) { 
        console.error("Settings Error:", error);
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
        console.log(`\n🟢 [WEBHOOK] Imeunganishwa na Meta Kikamilifu!`);
        return res.status(200).send(challenge);
    }
    
    console.log(`\n🔴 [WEBHOOK] Jaribio lisilo halali la kuunganisha. Token: ${token}`);
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    // Tunajibu haraka Meta kabla ya kufanya processing
    res.sendStatus(200); 
    
    try {
        const body = req.body;
        if (body?.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    const value = change.value;
                    if (!value) continue;

                    const incomingPhoneId = value.metadata?.phone_number_id;
                    let business = null;

                    if (incomingPhoneId) {
                        business = await prisma.business.findFirst({ where: { whatsappPhoneId: incomingPhoneId } });
                    }
                    
                    if (!business) {
                        console.log(`⚠️ [WEBHOOK] Hakuna biashara iliyo na Phone ID: ${incomingPhoneId}`);
                        continue;
                    }

                    // A) KUKAMATA TIKI ZA WHATSAPP (MESSAGE STATUS UPDATES)
                    if (value.statuses && value.statuses.length > 0) {
                        for (const statusObj of value.statuses) {
                            const newStatus = statusObj.status.toUpperCase(); 
                            
                            // Update message status kwenye database
                            await prisma.message.updateMany({ 
                                where: { metaMsgId: statusObj.id }, 
                                data: { 
                                    status: newStatus,
                                    ...(statusObj.timestamp && { deliveredAt: new Date(parseInt(statusObj.timestamp) * 1000) })
                                } 
                            });
                            
                            // Tuma update kwa mteja kupitia Socket.io
                            io.to(business.id).emit('messageStatusUpdate', {
                                metaMsgId: statusObj.id,
                                status: newStatus,
                                timestamp: statusObj.timestamp
                            });

                            // Console logging kwa admin
                            let tickIcon = newStatus === 'READ' ? '🔵' : 
                                          newStatus === 'DELIVERED' ? '🔘' : 
                                          newStatus === 'SENT' ? '⚪' : '❌';
                            
                            console.log(`   ${tickIcon} [TIKI LIVE] -> ${business.businessName} | Status: ${newStatus}`);
                        }
                    }

                    // B) KUKAMATA MESEJI MPYA INAYOINGIA
                    if (value.messages && value.messages.length > 0) {
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

                            // Tafuta au tengeneza contact
                            let dbContact = await prisma.contact.findFirst({ 
                                where: { businessId: business.id, phoneNumber: phoneNumber } 
                            });
                            
                            if (!dbContact) {
                                dbContact = await prisma.contact.create({ 
                                    data: { 
                                        businessId: business.id, 
                                        phoneNumber: phoneNumber, 
                                        name: customerName 
                                    } 
                                });
                            }

                            // Check kama message tayari ipo (deduplication)
                            const existingMsg = await prisma.message.findFirst({ 
                                where: { metaMsgId: message.id } 
                            });
                            
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

                                // Tuma notification kwa mteja kupitia Socket.io
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
        }
    } catch (error) { 
        console.error("❌ Kosa la Webhook:", error.message); 
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
                    where: { 
                        contactId: c.id, 
                        direction: 'INBOUND', 
                        status: 'RECEIVED' 
                    } 
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
        console.error("Contacts Error:", error);
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
        console.error("Messages Error:", error);
        res.status(500).json({ error: error.message }); 
    }
});

app.post('/api/chat/send', verifyToken, async (req, res) => {
    try {
        const { contactId, phone, messageText } = req.body;
        
        // Validate input
        if (!phone || !messageText || !contactId) {
            return res.status(400).json({ success: false, error: "Taarifa za meseji hazijakamilika." });
        }
        
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });

        // Check kama business ipo na ni active
        if (!business || !business.isActive) {
            return res.status(403).json({ success: false, error: "Akaunti yako haipo au imesitishwa." });
        }

        const phoneIdToUse = business.whatsappPhoneId;
        if (!phoneIdToUse) {
            return res.status(403).json({ 
                success: false, 
                error: "Hujaunganishwa Phone ID yako. Tafadhali iweke kwenye mipangilio kwanza." 
            });
        }
        
        // 🔥 CHECK WALLET BALANCE KABLA YA KUTUMA (Admin anakua charged na Meta, mteja anakua charged na Kedesh)
        if (business.walletBalance < LIVE_CHAT_COST) {
            return res.status(402).json({ 
                success: false, 
                error: `Salio lako halitoshi. Unahitaji TZS ${LIVE_CHAT_COST} kujibu. Salio lako sasa: TZS ${business.walletBalance}` 
            });
        }

        // 🔑 TUNAITUMIA ADMIN TOKEN KUTUMA KWA NIABA YA MTEJA
        const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, messageText, 'text');

        // Transaction: Create message NA update wallet kwa wakati mmoja
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
                data: { 
                    walletBalance: { decrement: LIVE_CHAT_COST },
                    totalMessagesSent: { increment: 1 }
                } 
            })
        ]);

        console.log(`\n💬 [LIVE CHAT] ${business.businessName} amemjibu mteja.`);
        console.log(`   ├─ Meseji: "${messageText.substring(0, 30)}..."`);
        console.log(`   ├─ Makato: TZS ${LIVE_CHAT_COST}`);
        console.log(`   └─ Salio Jipya: TZS ${updatedBiz.walletBalance}\n`);
        
        // Tuma update kwa mteja kupitia Socket.io
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

        // Tuma update ya salio
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
        console.error("Send Message Error:", error.response?.data || error.message);
        
        const errorMsg = error.response?.data?.error?.message || "";
        const errorCode = error.response?.data?.error?.code;

        // Handle specific WhatsApp errors
        if(errorMsg.includes('24 hour') || errorMsg.includes('outside the allowed') || errorCode === 131047) {
            return res.status(400).json({ 
                success: false, 
                error: "Masaa 24 yameisha tangu mteja huyu atume meseji. Kisheria, huwezi kutuma ujumbe wa kawaida hapa. Tumia Template kuanzisha mazungumzo." 
            });
        }
        
        if(errorMsg.includes('access token') || errorMsg.includes('authorization') || errorCode === 190) {
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
    try {
        const { contacts, campaignName, templateName, templateLanguage, headerImageUrl } = req.body; 
        
        if (!contacts || contacts.length === 0) {
            return res.status(400).json({ success: false, error: "Namba za wateja hazipo." });
        }

        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        
        // Check kama business ipo na ni active
        if (!business || !business.isActive) {
            return res.status(403).json({ success: false, error: "Akaunti yako haipo au imesitishwa." });
        }
        
        const phoneIdToUse = business.whatsappPhoneId;
        if (!phoneIdToUse) {
            return res.status(403).json({ 
                success: false, 
                error: "Akaunti yako haijaunganishwa Phone ID. Tafadhali iweke kwenye mipangilio kwanza." 
            });
        }
        
        // 🔥 CALCULATE COST NA KAGUA SALIO KABLA YA KUTUMA
        const totalEstimatedCost = contacts.length * BULK_SMS_COST;
        if (business.walletBalance < totalEstimatedCost) {
            return res.status(402).json({ 
                success: false, 
                error: `Salio halitoshi. Unahitaji TZS ${totalEstimatedCost} kwa wateja ${contacts.length}. Salio lako sasa: TZS ${business.walletBalance}` 
            });
        }

        console.log(`\n┏━━━━━━━━━━━━━━━━ 🚀 KAMPENI MPYA INAANZA ━━━━━━━━━━━━━━━━┓`);
        console.log(`┃ BIASHARA : ${business.businessName}`);
        console.log(`┃ WATEJA   : ${contacts.length}`);
        console.log(`┃ TEMPLATE : ${templateName} (${templateLanguage})`);
        console.log(`┃ GHARAMA  : TZS ${totalEstimatedCost}`);
        console.log(`┃ TOKEN    : ADMIN (Kedesh Limited) - Kwa niaba ya mteja 🔑`);
        console.log(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`);
        
        let successCount = 0; 
        let failedCount = 0; 
        let failedNumbers = [];
        let sentMessageIds = [];

        // Tuma messages sequentially kwa delay ya 300ms
        for (let phone of contacts) {
            try {
                let templatePayload = { 
                    name: templateName || "hello_world", 
                    language: { code: templateLanguage || "sw" } 
                };

                // Add header image kama ipo
                if (headerImageUrl && headerImageUrl.trim() !== '') {
                    templatePayload.components = [{ 
                        type: "header", 
                        parameters: [{ 
                            type: "image", 
                            image: { link: headerImageUrl.trim() } 
                        }] 
                    }];
                }

                // 🔑 TUNAITUMIA ADMIN TOKEN KUTUMA KWA NIABA YA MTEJA
                const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, templatePayload, 'template');
                
                successCount++;
                process.stdout.write(`✅ `);
                const metaMsgId = metaRes.data.messages[0].id;

                // Tafuta au tengeneza contact
                let dbContact = await prisma.contact.findFirst({ 
                    where: { businessId: business.id, phoneNumber: phone } 
                });
                
                if (!dbContact) {
                    dbContact = await prisma.contact.create({ 
                        data: { 
                            businessId: business.id, 
                            phoneNumber: phone, 
                            name: phone 
                        } 
                    });
                }

                // Save message kwenye database
                await prisma.message.create({
                    data: { 
                        businessId: business.id, 
                        contactId: dbContact.id, 
                        metaMsgId: metaMsgId, 
                        direction: 'OUTBOUND', 
                        content: `📢 [Kampeni: ${campaignName || 'Ofa'} - Tmp: ${templateName}]`, 
                        status: 'SENT',
                        messageType: 'template'
                    }
                });

                sentMessageIds.push(metaMsgId);

                // Delay kuepuka rate limiting
                await new Promise(resolve => setTimeout(resolve, 300)); 
                
            } catch (error) {
                failedCount++;
                const metaError = error.response?.data?.error?.message || error.message;
                process.stdout.write(`❌ `);
                failedNumbers.push({ phone, reason: metaError.substring(0, 100) });
            }
        }

        // 🔥 UPDATE WALLET BALANCE YA MTEJA (Makato ya kweli yaliyotumika)
        const actualCost = successCount * BULK_SMS_COST;
        let newBalance = business.walletBalance;
        
        if (actualCost > 0) {
            const updatedBiz = await prisma.business.update({ 
                where: { id: business.id }, 
                data: { 
                    walletBalance: { decrement: actualCost },
                    totalMessagesSent: { increment: successCount },
                    totalCampaignsSent: { increment: 1 }
                } 
            });
            newBalance = updatedBiz.walletBalance;
        }

        console.log(`\n\n╔════════════════ 🏁 KAMPENI IMEKAMILIKA ════════════════╗`);
        console.log(`║ ✅ YAMEFIKA    : ${successCount}/${contacts.length}`);
        console.log(`║ ❌ YAMEFELI    : ${failedCount}`);
        console.log(`║ 💰 MAKATO      : TZS ${actualCost}`);
        console.log(`║ 🏦 SALIO MPYA  : TZS ${newBalance}`);
        console.log(`╚════════════════════════════════════════════════════════╝\n`);

        // Tuma notification kwa mteja kupitia Socket.io
        io.to(business.id).emit('campaignComplete', {
            campaignName: campaignName || 'Kampeni',
            stats: {
                total: contacts.length,
                success: successCount,
                failed: failedCount
            },
            newBalance: newBalance
        });

        return res.status(200).json({ 
            success: true, 
            message: "Kampeni Imekamilika", 
            stats: { 
                total: contacts.length, 
                success: successCount, 
                failed: failedCount 
            }, 
            newBalance,
            failedNumbers: failedNumbers.slice(0, 10) // Rudisha 10 tu kuepuka payload kubwa
        });
        
    } catch (error) { 
        console.error("Bulk SMS Error:", error);
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
        version: "2.0.0",
        uptime: process.uptime()
    }); 
});

// ==========================================
// 🚦 10. ERROR HANDLING MIDDLEWARE
// ==========================================
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ 
        success: false, 
        error: "Hitilafu isiyotarajiwa imetokea. Tafadhali jaribu tena baadaye." 
    });
});

// ==========================================
// 🚀 11. START SERVER
// ==========================================
server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(` 🚀 KEDESH SAAS BACKEND IMESIMAMA IMARA NA INASUBIRI KAZI `);
    console.log(`=============================================================`);
    console.log(` 🟢 PORT          : ${PORT}`);
    console.log(` 🏢 MUUNDO        : Hybrid Multi-Tenant (Tech Provider Model)`);
    console.log(` 🔑 MFUMO         : Admin Token Inatumwa - Mteja Anakaguliwa Salio`);
    console.log(` 💰 LIVE CHAT     : TZS ${LIVE_CHAT_COST}/ujumbe`);
    console.log(` 💰 BULK SMS      : TZS ${BULK_SMS_COST}/ujumbe`);
    console.log(` ⚡ SOCKET.IO     : Ipo Hewani, Inasukuma SMS & Tiki LIVE!`);
    console.log(` 🛡️ ULINZI        : Wallet Check Kabla ya Kutuma`);
    console.log(` 📡 WEBHOOK       : Imejikita kwa META_VERIFY_TOKEN`);
    console.log(`=============================================================\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        prisma.$disconnect();
    });
});