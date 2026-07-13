require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
const axios = require('axios');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const { PrismaClient } = require('@prisma/client'); 

// 🚀 TUNAINGIZA SOCKET.IO NA HTTP SERVER
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// 🔥 Kutatua kosa la X-Forwarded-For kwenye Render au Cloud Proxy
app.set('trust proxy', 1);

const server = http.createServer(app); 

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient(); 

// ==========================================
// ⚙️ 1. BEI ZA KIBILIONEA (SAAS PRICING) 💰
// ==========================================
const BULK_SMS_COST = 84;   // Makato kwa Bulk SMS
const LIVE_CHAT_COST = 30;  // Makato kwa Live Chat

// Tunavuta funguo zote muhimu kutoka kwenye .env
const { 
    META_VERIFY_TOKEN, 
    META_ACCESS_TOKEN, 
    META_APP_ID, 
    META_APP_SECRET 
} = process.env;

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
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

const apiLimiter = rateLimit({ 
    windowMs: 1 * 60 * 1000, 
    max: 200, 
    standardHeaders: true, 
    legacyHeaders: false,
    message: { success: false, error: "Umefikia kikomo cha maombi. Subiri dakika 1." }
});
app.use('/api/', apiLimiter); 

const authLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 15, 
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
                return res.status(401).json({ success: false, error: "Tiketi imekwisha muda. Ingia upya." });
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
 * 🔥 KUTUMA KWA NIABA YA MTEJA KUPITIA ADMIN TOKEN
 * Hii ndiyo siri ya Tech Provider - inatumia META_ACCESS_TOKEN ya Admin
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
 * 🔒 KUTHIBITISHA TOKEN YA MTEJA KUPITIA META
 */
const verifyCustomerToken = async (customerToken) => {
    try {
        const response = await axios.get(
            `https://graph.facebook.com/me?fields=id,name&access_token=${customerToken}`, 
            { timeout: 10000 }
        );
        return response.data;
    } catch (error) {
        throw new Error("Token ya mteja si halali au imekwisha muda.");
    }
};

/**
 * 🗄️ HELPER: Tafuta au tengeneza contact
 */
const findOrCreateContact = async (businessId, phoneNumber, name) => {
    let contact = await prisma.contact.findFirst({ 
        where: { businessId, phoneNumber } 
    });
    
    if (!contact) {
        contact = await prisma.contact.create({ 
            data: { businessId, phoneNumber, name: name || phoneNumber } 
        });
    }
    
    return contact;
};

/**
 * 🗄️ HELPER: Save message kwa usalama (upsert)
 * HII NDIYO KINGA KUU DHIDI YA "Invalid prisma.message.create()" ERROR
 */
const saveMessageSafe = async (messageData) => {
    const { metaMsgId, businessId, contactId, direction, content, status, messageType } = messageData;
    
    // 🔥🔥🔥 UPSERT BADALA YA CREATE - HII INAZULA DUPLICATE ERROR KABISA 🔥🔥🔥
    return await prisma.message.upsert({
        where: { metaMsgId },
        update: { 
            status,
            content,
            ...(direction === 'INBOUND' && { messageType })
        },
        create: {
            businessId,
            contactId,
            metaMsgId,
            direction,
            content,
            status,
            messageType: messageType || 'text'
        }
    });
};

// ========================================================
// ⚡ 2. MTAMBO WA SOCKET.IO (REAL-TIME ENGINE)
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
    const businessId = socket.businessId;
    console.log(`🔌 [SOCKET LIVE] Ofisi ID: ${businessId} imeunganishwa.`);
    socket.join(businessId);

    socket.on('disconnect', () => {
        console.log(`🔴 [SOCKET OFF] Ofisi ID: ${businessId} imetoka.`);
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

        res.status(200).json({ 
            success: true, 
            stats: { 
                totalContacts, 
                totalSent, 
                totalDelivered, 
                totalFailed,
                walletBalance: business?.walletBalance || 0
            } 
        });
    } catch (error) { 
        console.error("❌ [Stats Error]:", error.message);
        res.status(500).json({ success: false, error: "Imeshindwa kuvuta takwimu." }); 
    }
});

// ==========================================
// 💰 4. API YA SALIO
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
// 🔐 5. API ZA AUTHENTICATION
// ==========================================

// 5.1: USAJILI
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { businessName, fullName, phone, password } = req.body;
        
        if (!phone || !password) {
            return res.status(400).json({ success: false, error: "Namba ya simu na nenosiri ni lazima." });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: "Nenosiri linatakiwa liwe na angalau herufi 6." });
        }

        const phoneRegex = /^\d{9,15}$/;
        if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
            return res.status(400).json({ success: false, error: "Muundo wa namba si sahihi." });
        }

        const existingBusiness = await prisma.business.findFirst({ where: { phone } });
        if (existingBusiness) {
            return res.status(409).json({ success: false, error: "Namba hii tayari imeshasajiliwa. Tafadhali ingia." });
        }

        const salt = await bcrypt.genSalt(12);
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

        console.log(`🎊 [MTEJA MPYA] -> ${businessName} | +${phone}`);
        res.status(201).json({ success: true, message: "Usajili umekamilika! Unaweza kuingia sasa." });
    } catch (error) { 
        console.error("❌ [Register Error]:", error.message);
        res.status(500).json({ success: false, error: "Hitilafu imetokea wakati wa usajili." }); 
    }
});

// 5.2: LOGIN
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        if (!phone || !password) {
            return res.status(400).json({ success: false, error: "Namba ya simu na nenosiri ni lazima." });
        }

        const business = await prisma.business.findFirst({ where: { phone } });
        
        if (!business) {
            return res.status(401).json({ success: false, error: "Namba hii haijasajiliwa." });
        }

        if (!business.password) {
            return res.status(401).json({ 
                success: false, 
                error: "Akaunti hii iliunganishwa kupitia Facebook. Tumia 'Endelea na Facebook'." 
            });
        }

        const isMatch = await bcrypt.compare(password, business.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: "Nenosiri sio sahihi." });
        }

        const token = jwt.sign({ businessId: business.id }, JWT_SECRET, { expiresIn: '7d' });
        console.log(`🔓 [LOGIN] -> ${business.businessName}`);
        
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
        res.status(500).json({ success: false, error: "Hitilafu kwenye Server." }); 
    }
});

// 🔥 5.3: FACEBOOK LOGIN (PRODUCTION READY)
app.post('/api/auth/facebook-login', authLimiter, async (req, res) => {
    try {
        const { accessToken: codeOrToken } = req.body;
        if (!codeOrToken) {
            return res.status(400).json({ success: false, error: "Access Token au Code inahitajika." });
        }

        let finalToken = codeOrToken;

        // Badilisha code kuwa token kama haijaanza na 'EAA'
        if (!codeOrToken.startsWith('EAA')) {
            console.log('🔄 [META] Kubadili Code -> Token...');
            try {
                const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token`;
                const tokenRes = await axios.get(tokenUrl, {
                    params: {
                        client_id: META_APP_ID,
                        client_secret: META_APP_SECRET,
                        code: codeOrToken
                    },
                    timeout: 10000
                });
                finalToken = tokenRes.data.access_token;
                console.log('✅ Token imepatikana.');
            } catch (error) {
                console.error('❌ Imeshindwa kubadili code:', error.response?.data || error.message);
                return res.status(400).json({ success: false, error: "Imeshindwa kubadilisha code ya Meta." });
            }
        }

        // Thibitisha token
        let fbUser;
        try {
            fbUser = await verifyCustomerToken(finalToken);
        } catch (error) {
            return res.status(401).json({ success: false, error: "Imeshindwa kuthibitisha akaunti yako ya Facebook." });
        }

        console.log(`✅ [META] ${fbUser.name} (${fbUser.id}) amethibitishwa.`);

        let wabaId = null;
        let phoneId = null;

        // 1. Tafuta WABA kupitia Debug Token
        try {
            const debugUrl = `https://graph.facebook.com/v20.0/debug_token`;
            const debugRes = await axios.get(debugUrl, {
                params: {
                    input_token: finalToken,
                    access_token: `${META_APP_ID}|${META_APP_SECRET}`
                },
                timeout: 10000
            });
            
            const scopes = debugRes.data?.data?.granular_scopes || [];
            const wabaScope = scopes.find(s => 
                s.scope === 'whatsapp_business_management' || 
                s.scope === 'whatsapp_business_messaging'
            );
            
            if (wabaScope?.target_ids?.length > 0) {
                wabaId = wabaScope.target_ids[0];
                console.log(`✅ WABA ID: ${wabaId}`);
            }
        } catch(e) {
            console.log('⚠️ Debug Token haijafanikiwa.');
        }

        // 2. Njia mbadala - Tafuta kupitia Businesses
        if (!wabaId) {
            try {
                const bizRes = await axios.get(
                    `https://graph.facebook.com/v20.0/me/businesses`,
                    { params: { access_token: finalToken }, timeout: 10000 }
                );
                const businesses = bizRes.data?.data || [];
                
                for (const biz of businesses) {
                    try {
                        // Jaribu owned WABA
                        const ownedRes = await axios.get(
                            `https://graph.facebook.com/v20.0/${biz.id}/owned_whatsapp_business_accounts`,
                            { params: { access_token: finalToken }, timeout: 10000 }
                        );
                        if (ownedRes.data?.data?.length > 0) {
                            wabaId = ownedRes.data.data[0].id;
                            console.log(`✅ WABA (Owned): ${wabaId}`);
                            break;
                        }

                        // Jaribu client WABA
                        const clientRes = await axios.get(
                            `https://graph.facebook.com/v20.0/${biz.id}/client_whatsapp_business_accounts`,
                            { params: { access_token: finalToken }, timeout: 10000 }
                        );
                        if (clientRes.data?.data?.length > 0) {
                            wabaId = clientRes.data.data[0].id;
                            console.log(`✅ WABA (Client): ${wabaId}`);
                            break;
                        }
                    } catch(err) {
                        continue;
                    }
                }
            } catch(e) {
                console.log('⚠️ Business profile haijasomwa.');
            }
        }

        // 3. Vuta Phone ID
        if (wabaId) {
            try {
                const phoneRes = await axios.get(
                    `https://graph.facebook.com/v20.0/${wabaId}/phone_numbers`,
                    { params: { access_token: finalToken }, timeout: 10000 }
                );
                if (phoneRes.data?.data?.length > 0) {
                    phoneId = phoneRes.data.data[0].id;
                    console.log(`✅ Phone ID: ${phoneId}`);
                }
            } catch(e) {
                console.log('⚠️ Phone ID haijapatikana.');
            }
        }

        // 4. Create au Update business
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
            console.log(`🎉 [MTEJA MPYA] -> ${business.businessName}`);
        } else {
            const updateData = { metaAccessToken: finalToken };
            if (wabaId) updateData.wabaId = wabaId;
            if (phoneId) updateData.whatsappPhoneId = phoneId;
            
            business = await prisma.business.update({ where: { id: business.id }, data: updateData });
            console.log(`🔓 [LOGIN] -> ${business.businessName}`);
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
        console.error('❌ [META ERROR]:', error.message);
        res.status(500).json({ success: false, error: "Imeshindwa kuwasiliana na Meta." });
    }
});

// ==========================================
// ⚙️ 6. MIPANGILIO YA PHONE ID
// ==========================================
app.post('/api/settings/update', verifyToken, async (req, res) => {
    try {
        const { whatsappPhoneId } = req.body;
        if (!whatsappPhoneId?.trim()) {
            return res.status(400).json({ success: false, error: "Phone ID inahitajika." });
        }

        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        if (!business) return res.status(404).json({ success: false, error: "Biashara haijapatikana." });
        
        if (business.whatsappPhoneId && business.whatsappPhoneId !== whatsappPhoneId.trim()) {
            return res.status(403).json({ success: false, error: "Namba imefungwa. Wasiliana na Admin." });
        }

        await prisma.business.update({ 
            where: { id: req.user.businessId }, 
            data: { whatsappPhoneId: whatsappPhoneId.trim() } 
        });
        
        console.log(`🛡️ [PHONE ID] ${business.businessName} -> ${whatsappPhoneId.trim()}`);
        res.status(200).json({ success: true, message: "Phone ID imeunganishwa!" });
    } catch (error) { 
        console.error("❌ [Settings Error]:", error.message);
        res.status(500).json({ success: false, error: "Hitilafu kwenye mfumo." }); 
    }
});

// ==========================================
// 📡 7. WEBHOOK YA META (IMEBORESHWA)
// ==========================================
app.get('/webhook', (req, res) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    
    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
        console.log('🟢 [WEBHOOK] Imethibitishwa!');
        return res.status(200).send(challenge);
    }
    
    console.log('🔴 [WEBHOOK] Imekataliwa.');
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    // Jibu Meta haraka kabla ya processing
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

                const business = await prisma.business.findFirst({ 
                    where: { whatsappPhoneId: incomingPhoneId } 
                });
                if (!business) {
                    console.log(`⚠️ [WEBHOOK] Hakuna business yenye Phone ID: ${incomingPhoneId}`);
                    continue;
                }

                // A) STATUS UPDATES
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

                        const icons = { READ: '🔵', DELIVERED: '🔘', SENT: '⚪' };
                        console.log(`   ${icons[newStatus] || '❌'} [${newStatus}] -> ${business.businessName}`);
                    }
                }

                // B) INCOMING MESSAGES
                if (value.messages?.length > 0) {
                    for (const message of value.messages) {
                        const phoneNumber = message.from;
                        const customerName = value.contacts?.[0]?.profile?.name || phoneNumber;
                        
                        // Extract message body
                        let msgBody = '';
                        switch (message.type) {
                            case 'text':
                                msgBody = message.text.body;
                                break;
                            case 'button':
                                msgBody = message.button?.text || '[Kitufe]';
                                break;
                            case 'interactive':
                                msgBody = message.interactive?.button_reply?.title || 
                                         message.interactive?.list_reply?.title || 
                                         '[Mwitikio]';
                                break;
                            default:
                                msgBody = `📎 [${message.type}]`;
                        }

                        // Find or create contact
                        const dbContact = await findOrCreateContact(
                            business.id, 
                            phoneNumber, 
                            customerName
                        );

                        // 🔥🔥🔥 UPSERT - KINGA KUU DHIDI YA DUPLICATE ERROR 🔥🔥🔥
                        const savedMsg = await saveMessageSafe({
                            metaMsgId: message.id,
                            businessId: business.id,
                            contactId: dbContact.id,
                            direction: 'INBOUND',
                            content: msgBody,
                            status: 'RECEIVED',
                            messageType: message.type
                        });

                        console.log(`📥 [INBOX] ${customerName} -> ${business.businessName}: "${msgBody.substring(0, 40)}..."`);

                        // Tuma notification kwa mteja
                        io.to(business.id).emit('newIncomingMessage', {
                            contactId: dbContact.id,
                            contactName: customerName,
                            phoneNumber,
                            message: {
                                id: savedMsg.id,
                                content: savedMsg.content,
                                direction: savedMsg.direction,
                                status: savedMsg.status,
                                createdAt: savedMsg.createdAt
                            }
                        });
                    }
                }
            }
        }
    } catch (error) { 
        console.error('❌ [Webhook Error]:', error.message); 
    }
});

// ==========================================
// 📱 8. API ZA LIVE CHAT
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
        
        const formatted = await Promise.all(
            contacts
                .filter(c => c.messages.length > 0)
                .map(async c => ({
                    id: c.id, 
                    name: c.name || c.phoneNumber, 
                    phone: c.phoneNumber,
                    lastMsg: c.messages[0]?.content || '...', 
                    time: c.messages[0]?.createdAt,
                    unread: await prisma.message.count({ 
                        where: { contactId: c.id, direction: 'INBOUND', status: 'RECEIVED' } 
                    }),
                    lastSender: c.messages[0]?.direction === 'OUTBOUND' ? 'me' : 'them',
                    lastStatus: c.messages[0]?.status
                }))
        );
        
        formatted.sort((a, b) => new Date(b.time) - new Date(a.time));
        res.status(200).json({ success: true, contacts: formatted });
    } catch (error) { 
        console.error('❌ [Contacts Error]:', error.message);
        res.status(500).json({ error: error.message }); 
    }
});

app.get('/api/chat/messages/:contactId', verifyToken, async (req, res) => {
    try {
        const { contactId } = req.params;
        const businessId = req.user.businessId;
        
        // Mark as read
        await prisma.message.updateMany({ 
            where: { contactId, businessId, direction: 'INBOUND', status: 'RECEIVED' }, 
            data: { status: 'READ' } 
        });
        
        const messages = await prisma.message.findMany({ 
            where: { contactId, businessId }, 
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
        console.error('❌ [Messages Error]:', error.message);
        res.status(500).json({ error: error.message }); 
    }
});

app.post('/api/chat/send', verifyToken, async (req, res) => {
    try {
        const { contactId, phone, messageText } = req.body;
        
        if (!phone || !messageText?.trim() || !contactId) {
            return res.status(400).json({ success: false, error: "Taarifa hazijakamilika." });
        }
        
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        
        if (!business) return res.status(404).json({ success: false, error: "Akaunti haijapatikana." });
        if (!business.whatsappPhoneId) return res.status(403).json({ success: false, error: "Phone ID haijaunganishwa." });
        if (business.walletBalance < LIVE_CHAT_COST) {
            return res.status(402).json({ 
                success: false, 
                error: `Salio halitoshi. Unahitaji TZS ${LIVE_CHAT_COST}. Salio: TZS ${business.walletBalance}` 
            });
        }

        const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, messageText.trim(), 'text');
        const metaMsgId = metaRes.data.messages[0].id;

        // 🔥🔥🔥 UPSERT - HAKUNA DUPLICATE ERROR 🔥🔥🔥
        const [savedMsg, updatedBiz] = await prisma.$transaction([
            saveMessageSafe({
                metaMsgId,
                businessId: business.id,
                contactId,
                direction: 'OUTBOUND',
                content: messageText.trim(),
                status: 'SENT',
                messageType: 'text'
            }),
            prisma.business.update({ 
                where: { id: business.id }, 
                data: { walletBalance: { decrement: LIVE_CHAT_COST } } 
            })
        ]);

        console.log(`💬 [LIVE CHAT] ${business.businessName} -> +${phone} | Salio: TZS ${updatedBiz.walletBalance}`);
        
        // Tuma updates kupitia Socket.io
        io.to(business.id).emit('newIncomingMessage', {
            contactId,
            contactName: 'You',
            phoneNumber: phone,
            message: {
                id: savedMsg.id,
                content: savedMsg.content,
                direction: savedMsg.direction,
                status: savedMsg.status,
                createdAt: savedMsg.createdAt
            }
        });
        
        io.to(business.id).emit('walletUpdate', { newBalance: updatedBiz.walletBalance });

        res.status(200).json({ 
            success: true, 
            message: 'Imetumwa',
            newBalance: updatedBiz.walletBalance, 
            newMsg: {
                id: savedMsg.id,
                content: savedMsg.content,
                status: savedMsg.status,
                createdAt: savedMsg.createdAt
            }
        });
    } catch (error) { 
        console.error('❌ [Send Error]:', error.response?.data || error.message);
        
        const errMsg = error.response?.data?.error?.message || '';
        const errCode = error.response?.data?.error?.code;
        
        if (errMsg.includes('24 hour') || errCode === 131047) {
            return res.status(400).json({ success: false, error: "Masaa 24 yameisha. Tumia Template kuanzisha mazungumzo." });
        }
        if (errMsg.includes('access token') || errCode === 190) {
            return res.status(401).json({ success: false, error: "Hitilafu ya uthibitisho na Meta. Wasiliana na admin." });
        }
        
        res.status(500).json({ success: false, error: "Imeshindikana kutuma. Jaribu tena." }); 
    }
});

// ==========================================
// 🚀 9. BULK SMS ENGINE (UPSERT PROTECTED) 🔥
// ==========================================
app.post('/api/send-bulk', verifyToken, async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { contacts, campaignName, templateName, templateLanguage, headerImageUrl } = req.body; 
        
        if (!contacts?.length) {
            return res.status(400).json({ success: false, error: "Namba za wateja hazipo." });
        }

        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        
        if (!business) return res.status(404).json({ success: false, error: "Akaunti haijapatikana." });
        if (!business.whatsappPhoneId) return res.status(403).json({ success: false, error: "Phone ID haijaunganishwa." });
        
        const totalEstimatedCost = contacts.length * BULK_SMS_COST;
        if (business.walletBalance < totalEstimatedCost) {
            return res.status(402).json({ 
                success: false, 
                error: `Salio halitoshi. Unahitaji TZS ${totalEstimatedCost} kwa wateja ${contacts.length}. Salio: TZS ${business.walletBalance}` 
            });
        }

        // 🔥 PRO-LEVEL LOGGING 🔥
        console.log(`\n┏━━━━━━━━━━━━━━━━ 🚀 KAMPENI MPYA ━━━━━━━━━━━━━━━━┓`);
        console.log(`┃ BIASHARA    : ${business.businessName}`);
        console.log(`┃ WATEJA      : ${contacts.length}`);
        console.log(`┃ TEMPLATE    : ${templateName || 'hello_world'} (${templateLanguage || 'sw'})`);
        console.log(`┃ GHARAMA/JUM : TZS ${BULK_SMS_COST} | JUMLA: TZS ${totalEstimatedCost}`);
        console.log(`┃ SALIO AWALI : TZS ${business.walletBalance}`);
        console.log(`┃ ULINZI      : UPSERT Protection Active ✅`);
        console.log(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`);
        
        let successCount = 0;
        let failedCount = 0;
        const failedNumbers = [];

        for (const phone of contacts) {
            try {
                // Prepare template payload
                const templatePayload = { 
                    name: templateName || "hello_world", 
                    language: { code: templateLanguage || "sw" } 
                };
                
                if (headerImageUrl?.trim()) {
                    templatePayload.components = [{ 
                        type: "header", 
                        parameters: [{ 
                            type: "image", 
                            image: { link: headerImageUrl.trim() } 
                        }] 
                    }];
                }

                // Tuma kwa Meta
                const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, templatePayload, 'template');
                successCount++;
                const metaMsgId = metaRes.data.messages[0].id;
                process.stdout.write('✅ ');

                // Tafuta au tengeneza contact
                const dbContact = await findOrCreateContact(business.id, phone, phone);

                // 🔥🔥🔥 UPSERT - HAKUNA KABISA DUPLICATE ERROR 🔥🔥🔥
                await saveMessageSafe({
                    metaMsgId,
                    businessId: business.id,
                    contactId: dbContact.id,
                    direction: 'OUTBOUND',
                    content: `📢 [${campaignName || 'Kampeni'}] - Template: ${templateName}`,
                    status: 'SENT',
                    messageType: 'template'
                });

                // Log progress kila baada ya SMS 50
                if (successCount % 50 === 0) {
                    const progress = ((successCount / contacts.length) * 100).toFixed(1);
                    console.log(`\n   📦 Zimetumwa: ${successCount} | Progress: ${progress}%`);
                }

                // Delay ya 300ms kuepuka rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                failedCount++;
                process.stdout.write('❌ ');
                
                const metaError = error.response?.data?.error?.message || error.message;
                const errorCode = error.response?.data?.error?.code;
                
                failedNumbers.push({ 
                    phone, 
                    reason: metaError.substring(0, 80),
                    code: errorCode || 'UNKNOWN'
                });
                
                // Acha kutuma kama token imekwisha
                if (errorCode === 190 || metaError.includes('access token')) {
                    console.error('\n⚠️ [TOKEN ERROR] Inasimamisha kampeni.');
                    break;
                }
            }
        }

        // Calculate actual cost na update wallet
        const actualCost = successCount * BULK_SMS_COST;
        let newBalance = business.walletBalance;
        
        if (actualCost > 0) {
            const updated = await prisma.business.update({ 
                where: { id: business.id }, 
                data: { walletBalance: { decrement: actualCost } } 
            });
            newBalance = updated.walletBalance;
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        // 🔥 RIPOTI YA MWISHO 🔥
        console.log(`\n╔════════════════ 🏁 KAMPENI IMEKAMILIKA ════════════════╗`);
        console.log(`║ ✅ Zilizofika   : ${successCount}/${contacts.length} (${((successCount/contacts.length)*100).toFixed(1)}%)`);
        console.log(`║ ❌ Zilizofeli   : ${failedCount}`);
        console.log(`║ 💰 Gharama      : TZS ${actualCost} (@ TZS ${BULK_SMS_COST} x ${successCount})`);
        console.log(`║ 🏦 Salio Awali  : TZS ${business.walletBalance}`);
        console.log(`║ 🏦 Salio Mpya   : TZS ${newBalance}`);
        console.log(`║ ⏱️  Muda         : Sekunde ${duration}`);
        console.log(`╚════════════════════════════════════════════════════════╝\n`);

        // Tuma notification kupitia Socket.io
        io.to(business.id).emit('campaignComplete', {
            campaignName: campaignName || 'Kampeni',
            stats: { 
                total: contacts.length, 
                success: successCount, 
                failed: failedCount, 
                duration 
            },
            newBalance
        });

        // Jibu kwa mteja
        res.status(200).json({ 
            success: true, 
            message: `Kampeni imekamilika. ${successCount}/${contacts.length} zimefika kwa sekunde ${duration}.`,
            stats: { 
                total: contacts.length, 
                success: successCount, 
                failed: failedCount, 
                duration 
            }, 
            newBalance,
            failedNumbers: failedNumbers.slice(0, 10)
        });
        
    } catch (error) { 
        console.error('❌ [Bulk SMS Fatal Error]:', error.message);
        res.status(500).json({ 
            success: false, 
            error: "Hitilafu imetokea wakati wa kutuma Bulk SMS. Tafadhali jaribu tena." 
        }); 
    }
});

// ==========================================
// 🏠 10. HEALTH CHECK
// ==========================================
app.get('/', (req, res) => { 
    res.status(200).json({ 
        status: "Online 🟢", 
        version: "2.3.1",
        architecture: "Hybrid Multi-Tenant with UPSERT Protection",
        features: [
            "Bulk SMS with upsert (no duplicate errors)",
            "Live Chat with upsert (no duplicate errors)",
            "Webhook with upsert (no duplicate errors)",
            "Token verification",
            "Rate limiting",
            "Graceful shutdown"
        ],
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    }); 
});

// ==========================================
// 🚦 11. GLOBAL ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
    console.error("🚨 [UNHANDLED ERROR]:", err.stack || err.message);
    
    if (res.headersSent) {
        return next(err);
    }
    
    res.status(500).json({ 
        success: false, 
        error: "Hitilafu isiyotarajiwa imetokea.",
        reference: Date.now()
    });
});

// ==========================================
// 🚀 12. START SERVER
// ==========================================
server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(` 🚀 KEDESH SAAS BACKEND v2.3.1 IMESIMAMA IMARA `);
    console.log(`=============================================================`);
    console.log(` 🟢 PORT          : ${PORT}`);
    console.log(` 🏢 MUUNDO        : Hybrid Multi-Tenant + UPSERT Protection`);
    console.log(` 🔑 MFUMO         : Admin Token Inatumwa - Mteja Anakaguliwa Salio`);
    console.log(` 💰 LIVE CHAT     : TZS ${LIVE_CHAT_COST}/ujumbe`);
    console.log(` 💰 BULK SMS      : TZS ${BULK_SMS_COST}/ujumbe`);
    console.log(` ⚡ SOCKET.IO     : Ipo Hewani, Inasukuma SMS & Tiki LIVE!`);
    console.log(` 🛡️ ULINZI        : UPSERT kila mahali - Hakuna duplicate errors!`);
    console.log(` 📡 WEBHOOK       : Imejikita kwa META_VERIFY_TOKEN`);
    console.log(` 📝 CHANGELOG     : v2.3.1 - saveMessageSafe() helper, findOrCreateContact(),`);
    console.log(`                    Axios params format, better error handling`);
    console.log(`=============================================================\n`);
});

// ==========================================
// 🛑 13. GRACEFUL SHUTDOWN
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
process.on('unhandledRejection', (reason) => {
    console.error('🚨 [UNHANDLED REJECTION]:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('🚨 [UNCAUGHT EXCEPTION]:', error.stack);
    process.exit(1);
});