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
 */
const sendWhatsAppMessageAsAdmin = async (business, phone, payload, type = 'text') => {
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
        timeout: 15000
    });
};

/**
 * 🔒 FUNCTION YA KUTHIBITISHA TOKEN YA MTEJA
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

// 🔥 4.3: FACEBOOK LOGIN
app.post('/api/auth/facebook-login', authLimiter, async (req, res) => {
    try {
        const { accessToken: codeOrToken } = req.body;
        if (!codeOrToken) {
            return res.status(400).json({ success: false, error: "Access Token au Code inahitajika kutoka Meta." });
        }

        let finalToken = codeOrToken;

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

        let fbUser;
        try {
            fbUser = await verifyCustomerToken(finalToken);
        } catch (error) {
            return res.status(401).json({ success: false, error: "Imeshindwa kuthibitisha akaunti yako ya Facebook. Tafadhali jaribu tena." });
        }

        console.log(`✅ [META VERIFIED] Mtumiaji: ${fbUser.name} (Facebook ID: ${fbUser.id})`);

        let wabaId = null;
        let phoneId = null;

        // Tafuta WABA ID kupitia Debug Token
        try {
            console.log("🔍 [META] Kutafuta WABA ID kupitia Debug Token...");
            const debugUrl = `https://graph.facebook.com/v20.0/debug_token?input_token=${finalToken}&access_token=${META_APP_ID}%7C${META_APP_SECRET}`;
            const debugRes = await axios.get(debugUrl, { timeout: 10000 });
            const scopes = debugRes.data?.data?.granular_scopes || [];
            
            const wabaScope = scopes.find(s => s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging');
            if (wabaScope && wabaScope.target_ids?.length > 0) {
                wabaId = wabaScope.target_ids[0];
                console.log(`✅ WABA ID Imepatikana kupitia Debug Token: ${wabaId}`);
            }
        } catch(e) {
            console.log("⚠️ Imeshindwa kusoma Debug Token:", e.response?.data?.error?.message || e.message);
        }

        // Njia mbadala - Tafuta kupitia Businesses
        if (!wabaId) {
            try {
                console.log("🔍 [META] Kutafuta WABA ID kupitia Business Profile...");
                const bizRes = await axios.get(`https://graph.facebook.com/v20.0/me/businesses?access_token=${finalToken}`, { timeout: 10000 });
                const businesses = bizRes.data?.data || [];
                
                for (let b of businesses) {
                    try {
                        const wabaRes = await axios.get(`https://graph.facebook.com/v20.0/${b.id}/owned_whatsapp_business_accounts?access_token=${finalToken}`, { timeout: 10000 });
                        if (wabaRes.data?.data?.length > 0) {
                            wabaId = wabaRes.data.data[0].id;
                            console.log(`✅ WABA ID Imepatikana (Owned): ${wabaId}`);
                            break;
                        }

                        const clientWabaRes = await axios.get(`https://graph.facebook.com/v20.0/${b.id}/client_whatsapp_business_accounts?access_token=${finalToken}`, { timeout: 10000 });
                        if (clientWabaRes.data?.data?.length > 0) {
                            wabaId = clientWabaRes.data.data[0].id;
                            console.log(`✅ WABA ID Imepatikana (Client): ${wabaId}`);
                            break;
                        }
                    } catch(err) { continue; }
                }
                
                if (!wabaId) console.log("⚠️ Hakuna WABA iliyopatikana.");
            } catch(e) {
                console.log("⚠️ Imeshindwa kusoma Business Profile.");
            }
        }

        // Vuta Phone ID
        if (wabaId) {
            try {
                const phoneRes = await axios.get(`https://graph.facebook.com/v20.0/${wabaId}/phone_numbers?access_token=${finalToken}`, { timeout: 10000 });
                if (phoneRes.data?.data?.length > 0) {
                    phoneId = phoneRes.data.data[0].id;
                    console.log(`✅ Phone ID imepatikana: ${phoneId}`);
                }
            } catch(e) {
                console.log("⚠️ Hitilafu kuvuta Phone ID.");
            }
        }

        // Tafuta au tengeneza business
        let business = await prisma.business.findUnique({ where: { facebookId: fbUser.id } });

        if (!business) {
            const createData = {
                businessName: `${fbUser.name} Business`,
                fullName: fbUser.name,
                facebookId: fbUser.id,
                metaAccessToken: finalToken,
                walletBalance: 0.0,
                createdAt: new Date()
            };
            if (wabaId) createData.wabaId = wabaId;
            if (phoneId) createData.whatsappPhoneId = phoneId;
            
            business = await prisma.business.create({ data: createData });
            console.log(`\n🎉 [MTEJA MPYA SAAS (META)] -> ${business.businessName}`);
        } else {
            const updateData = { metaAccessToken: finalToken };
            if (wabaId) updateData.wabaId = wabaId;
            if (phoneId) updateData.whatsappPhoneId = phoneId;
            
            business = await prisma.business.update({ where: { id: business.id }, data: updateData });
            console.log(`🔓 [META LOGIN] ${business.businessName} anarejea.`);
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
        console.error("\n❌ [META API ERROR]:", error.message);
        res.status(500).json({ 
            success: false, 
            error: "Imeshindwa kuwasiliana na seva za Meta." 
        });
    }
});

// ==========================================
// ⚙️ 5. MIPANGILIO YA PHONE ID
// ==========================================
app.post('/api/settings/update', verifyToken, async (req, res) => {
    try {
        const { whatsappPhoneId } = req.body;
        if (!whatsappPhoneId?.trim()) return res.status(400).json({ success: false, error: "Phone ID inahitajika." });

        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        if (!business) return res.status(404).json({ success: false, error: "Biashara haijapatikana." });
        
        if (business.whatsappPhoneId && business.whatsappPhoneId !== whatsappPhoneId.trim()) {
            return res.status(400).json({ success: false, error: "Namba imefungwa. Wasiliana na Admin." });
        }

        await prisma.business.update({ where: { id: req.user.businessId }, data: { whatsappPhoneId: whatsappPhoneId.trim() } });
        res.status(200).json({ success: true, message: "Phone ID imeunganishwa!" });
    } catch (error) { 
        res.status(500).json({ success: false, error: "Hitilafu kwenye mfumo." }); 
    }
});

// ==========================================
// 📡 6. WEBHOOK
// ==========================================
app.get('/webhook', (req, res) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) return res.status(200).send(challenge);
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
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
                if (!business) continue;

                // Status updates
                if (value.statuses?.length > 0) {
                    for (const statusObj of value.statuses) {
                        await prisma.message.updateMany({ where: { metaMsgId: statusObj.id }, data: { status: statusObj.status.toUpperCase() } });
                        io.to(business.id).emit('messageStatusUpdate', { metaMsgId: statusObj.id, status: statusObj.status.toUpperCase() });
                    }
                }

                // Incoming messages
                if (value.messages?.length > 0) {
                    for (const message of value.messages) {
                        const phoneNumber = message.from;
                        const customerName = value.contacts?.[0]?.profile?.name || phoneNumber;
                        
                        let msgBody = message.type === 'text' ? message.text.body : 
                                     message.type === 'button' ? message.button?.text || "[Kitufe]" : 
                                     message.type === 'interactive' ? message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "[Mwitikio]" : 
                                     `📎 [${message.type}]`;

                        let dbContact = await prisma.contact.findFirst({ where: { businessId: business.id, phoneNumber } });
                        if (!dbContact) {
                            dbContact = await prisma.contact.create({ data: { businessId: business.id, phoneNumber, name: customerName } });
                        }

                        // 🔥 TUNAPITISHA KUPITIA UPSERT KUEBUKA DUPLICATE ERROR 🔥
                        await prisma.message.upsert({
                            where: { metaMsgId: message.id },
                            update: { status: 'RECEIVED' },
                            create: {
                                businessId: business.id,
                                contactId: dbContact.id,
                                metaMsgId: message.id,
                                direction: 'INBOUND',
                                content: msgBody,
                                status: 'RECEIVED',
                                messageType: message.type
                            }
                        });

                        io.to(business.id).emit('newIncomingMessage', {
                            contactId: dbContact.id,
                            contactName: customerName,
                            phoneNumber,
                            message: { id: Date.now(), content: msgBody, direction: 'INBOUND', status: 'RECEIVED', createdAt: new Date().toISOString() }
                        });
                    }
                }
            }
        }
    } catch (error) { 
        console.error("❌ [Webhook Error]:", error.message); 
    }
});

// ==========================================
// 📱 7. LIVE CHAT
// ==========================================
app.get('/api/chat/contacts', verifyToken, async (req, res) => {
    try {
        const contacts = await prisma.contact.findMany({ 
            where: { businessId: req.user.businessId }, 
            include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } } 
        });
        
        const formatted = await Promise.all(contacts.filter(c => c.messages.length > 0).map(async c => ({
            id: c.id, name: c.name || c.phoneNumber, phone: c.phoneNumber,
            lastMsg: c.messages[0]?.content || "...", time: c.messages[0]?.createdAt,
            unread: await prisma.message.count({ where: { contactId: c.id, direction: 'INBOUND', status: 'RECEIVED' } }),
            lastSender: c.messages[0]?.direction === 'OUTBOUND' ? 'me' : 'them',
            lastStatus: c.messages[0]?.status
        })));
        
        formatted.sort((a, b) => new Date(b.time) - new Date(a.time));
        res.status(200).json({ success: true, contacts: formatted });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

app.get('/api/chat/messages/:contactId', verifyToken, async (req, res) => {
    try {
        await prisma.message.updateMany({ 
            where: { contactId: req.params.contactId, businessId: req.user.businessId, direction: 'INBOUND', status: 'RECEIVED' }, 
            data: { status: 'READ' } 
        });
        const messages = await prisma.message.findMany({ where: { contactId: req.params.contactId, businessId: req.user.businessId }, orderBy: { createdAt: 'asc' } });
        res.status(200).json({ success: true, messages: messages.map(m => ({ id: m.id, content: m.content, direction: m.direction, status: m.status, createdAt: m.createdAt })) });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

app.post('/api/chat/send', verifyToken, async (req, res) => {
    try {
        const { contactId, phone, messageText } = req.body;
        if (!phone || !messageText || !contactId) return res.status(400).json({ success: false, error: "Taarifa hazijakamilika." });
        
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        if (!business) return res.status(404).json({ success: false, error: "Akaunti haijapatikana." });
        if (!business.whatsappPhoneId) return res.status(403).json({ success: false, error: "Phone ID haijaunganishwa." });
        if (business.walletBalance < LIVE_CHAT_COST) return res.status(402).json({ success: false, error: `Salio halitoshi. Unahitaji TZS ${LIVE_CHAT_COST}.` });

        const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, messageText, 'text');
        const metaMsgId = metaRes.data.messages[0].id;

        // 🔥 UPSERT KUEBUKA DUPLICATE ERROR KATIKA LIVE CHAT PIA 🔥
        const [newMessage, updatedBiz] = await prisma.$transaction([
            prisma.message.upsert({
                where: { metaMsgId },
                update: { status: 'SENT', content: messageText },
                create: {
                    businessId: business.id,
                    contactId,
                    metaMsgId,
                    direction: 'OUTBOUND',
                    content: messageText,
                    status: 'SENT',
                    messageType: 'text'
                }
            }),
            prisma.business.update({ where: { id: business.id }, data: { walletBalance: { decrement: LIVE_CHAT_COST } } })
        ]);

        console.log(`💬 [LIVE CHAT] ${business.businessName} -> +${phone} | Salio: TZS ${updatedBiz.walletBalance}`);
        
        io.to(business.id).emit('newIncomingMessage', {
            contactId, contactName: "You", phoneNumber: phone,
            message: { id: newMessage.id, content: newMessage.content, direction: newMessage.direction, status: newMessage.status, createdAt: newMessage.createdAt }
        });
        io.to(business.id).emit('walletUpdate', { newBalance: updatedBiz.walletBalance });

        res.status(200).json({ success: true, newBalance: updatedBiz.walletBalance, newMsg: { id: newMessage.id, content: newMessage.content, status: newMessage.status, createdAt: newMessage.createdAt } });
    } catch (error) { 
        const errMsg = error.response?.data?.error?.message || "";
        const errCode = error.response?.data?.error?.code;
        if (errMsg.includes('24 hour') || errCode === 131047) return res.status(400).json({ success: false, error: "Masaa 24 yameisha. Tumia Template." });
        if (errMsg.includes('access token') || errCode === 190) return res.status(401).json({ success: false, error: "Hitilafu ya uthibitisho na Meta." });
        res.status(500).json({ success: false, error: "Imeshindikana kutuma." }); 
    }
});

// ==========================================
// 🚀 8. BULK SMS ENGINE (FIX YA UPSERT) 🔥
// ==========================================
app.post('/api/send-bulk', verifyToken, async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { contacts, campaignName, templateName, templateLanguage, headerImageUrl } = req.body; 
        if (!contacts?.length) return res.status(400).json({ success: false, error: "Namba za wateja hazipo." });

        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        if (!business) return res.status(404).json({ success: false, error: "Akaunti haijapatikana." });
        if (!business.whatsappPhoneId) return res.status(403).json({ success: false, error: "Phone ID haijaunganishwa." });
        
        const totalCost = contacts.length * BULK_SMS_COST;
        if (business.walletBalance < totalCost) return res.status(402).json({ success: false, error: `Salio halitoshi. Unahitaji TZS ${totalCost}.` });

        console.log(`\n┏━━━━ 🚀 KAMPENI MPYA ━━━━┓`);
        console.log(`┃ BIASHARA: ${business.businessName}`);
        console.log(`┃ WATEJA  : ${contacts.length} | Gharama: TZS ${totalCost}`);
        console.log(`┗━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`);
        
        let successCount = 0, failedCount = 0;
        const failedNumbers = [];

        for (const phone of contacts) {
            try {
                const templatePayload = { 
                    name: templateName || "hello_world", 
                    language: { code: templateLanguage || "sw" } 
                };
                if (headerImageUrl?.trim()) {
                    templatePayload.components = [{ type: "header", parameters: [{ type: "image", image: { link: headerImageUrl.trim() } }] }];
                }

                const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, templatePayload, 'template');
                successCount++;
                const metaMsgId = metaRes.data.messages[0].id;
                process.stdout.write(`✅ `);

                let dbContact = await prisma.contact.findFirst({ where: { businessId: business.id, phoneNumber: phone } });
                if (!dbContact) {
                    dbContact = await prisma.contact.create({ data: { businessId: business.id, phoneNumber: phone, name: phone } });
                }

                // 🔥🔥🔥 BADILIKO KUU: TUNAPITISHA KUPITIA upsert BADALA YA create 🔥🔥🔥
                // Hii inazula kabisa "Invalid `prisma.message.create()` invocation" error
                await prisma.message.upsert({
                    where: { metaMsgId: metaMsgId },
                    update: { 
                        status: 'SENT',
                        content: `📢 [${campaignName || 'Kampeni'}] - Template: ${templateName}`
                    },
                    create: {
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
                process.stdout.write(`❌ `);
                const metaError = error.response?.data?.error?.message || error.message;
                failedNumbers.push({ phone, reason: metaError.substring(0, 80) });
                
                if (error.response?.data?.error?.code === 190) {
                    console.error(`\n⚠️ [TOKEN ERROR] Inasimamisha kutuma.`);
                    break;
                }
            }
        }

        const actualCost = successCount * BULK_SMS_COST;
        let newBalance = business.walletBalance;
        
        if (actualCost > 0) {
            const updated = await prisma.business.update({ where: { id: business.id }, data: { walletBalance: { decrement: actualCost } } });
            newBalance = updated.walletBalance;
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n╔════ 🏁 KAMPENI IMEKAMILIKA ════╗`);
        console.log(`║ ✅ Zilizofika: ${successCount}/${contacts.length}`);
        console.log(`║ ❌ Zilizofeli: ${failedCount}`);
        console.log(`║ 💰 Gharama   : TZS ${actualCost}`);
        console.log(`║ 🏦 Salio Mpya: TZS ${newBalance}`);
        console.log(`║ ⏱️  Muda      : ${duration}s`);
        console.log(`╚════════════════════════════════╝\n`);

        io.to(business.id).emit('campaignComplete', {
            campaignName: campaignName || 'Kampeni',
            stats: { total: contacts.length, success: successCount, failed: failedCount, duration },
            newBalance
        });

        res.status(200).json({ 
            success: true, 
            message: `Kampeni imekamilika. ${successCount}/${contacts.length} zimefika.`,
            stats: { total: contacts.length, success: successCount, failed: failedCount, duration },
            newBalance
        });
        
    } catch (error) { 
        console.error("❌ [Bulk SMS Error]:", error.message);
        res.status(500).json({ success: false, error: "Hitilafu imetokea wakati wa kutuma Bulk SMS." }); 
    }
});

// ==========================================
// 🏠 9. HEALTH CHECK
// ==========================================
app.get('/', (req, res) => { 
    res.status(200).json({ 
        status: "Online 🟢", 
        version: "2.3.0",
        architecture: "Hybrid Multi-Tenant with Upsert Protection",
        uptime: process.uptime()
    }); 
});

// ==========================================
// 🚦 10. GLOBAL ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
    console.error("🚨 [UNHANDLED ERROR]:", err.stack || err.message);
    if (res.headersSent) return next(err);
    res.status(500).json({ success: false, error: "Hitilafu isiyotarajiwa.", reference: Date.now() });
});

// ==========================================
// 🚀 11. START SERVER
// ==========================================
server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(` 🚀 KEDESH SAAS BACKEND v2.3.0 IMESIMAMA IMARA `);
    console.log(`=============================================================`);
    console.log(` 🟢 PORT          : ${PORT}`);
    console.log(` 🏢 MUUNDO        : Hybrid Multi-Tenant + Upsert Protection`);
    console.log(` 🔑 BULK SMS      : Inatumia upsert (Hakuna duplicate error)`);
    console.log(` 💬 LIVE CHAT     : Inatumia upsert (Hakuna duplicate error)`);
    console.log(` 📡 WEBHOOK       : Inatumia upsert (Hakuna duplicate error)`);
    console.log(`=============================================================\n`);
});

// ==========================================
// 🛑 GRACEFUL SHUTDOWN
// ==========================================
const gracefulShutdown = async (signal) => {
    console.log(`\n⚠️ ${signal} imepokelewa. Inazima server...`);
    server.close(async () => {
        await prisma.$disconnect();
        console.log('📴 Server imezimwa kwa utaratibu.');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => console.error('🚨 [UNHANDLED REJECTION]:', reason));
process.on('uncaughtException', (error) => {
    console.error('🚨 [UNCAUGHT EXCEPTION]:', error);
    process.exit(1);
});