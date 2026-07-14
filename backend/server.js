require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
const axios = require('axios');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const { PrismaClient } = require('@prisma/client'); 

const http = require('http');
const { Server } = require('socket.io');

const app = express();
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
// ⚙️ 1. BEI ZA SAAS PRICING 💰
// ==========================================
const BULK_SMS_COST = 84;
const LIVE_CHAT_COST = 30;

const { 
    META_VERIFY_TOKEN, 
    META_ACCESS_TOKEN, 
    META_APP_ID, 
    META_APP_SECRET 
} = process.env;

const JWT_SECRET = process.env.JWT_SECRET || "KEDESH_LIMITED_PREMIUM_SECRET_2026"; 

// ULINZI: Server haiwaki bila funguo za Meta
if (!META_VERIFY_TOKEN || !META_ACCESS_TOKEN || !META_APP_ID || !META_APP_SECRET) {
    console.error("\n🚨 [KOSA KUBWA LAKIUSALAMA] 🚨");
    console.error("Funguo za Meta hazijakamilika kwenye .env\n");
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
    windowMs: 1 * 60 * 1000, max: 200, 
    standardHeaders: true, legacyHeaders: false,
    message: { success: false, error: "Umefikia kikomo. Subiri dakika 1." }
});
app.use('/api/', apiLimiter); 

const authLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, max: 15, 
    standardHeaders: true, legacyHeaders: false,
    message: { success: false, error: "Umejaribu mara nyingi. Subiri dakika 15." } 
});

// ==========================================
// 🔐 MIDDLEWARE YA TOKEN
// ==========================================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ success: false, error: "Tiketi inahitajika." });
    
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(403).json({ success: false, error: "Muundo wa tiketi si sahihi." });
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            const msg = err.name === 'TokenExpiredError' ? "Tiketi imekwisha muda." : "Tiketi si halali.";
            return res.status(401).json({ success: false, error: `${msg} Ingia upya.` });
        }
        req.user = decoded; 
        next();
    });
};

// ==========================================
// 🚀 ENGINE YA KUTUMA UJUMBE
// ==========================================
const sendWhatsAppMessageAsAdmin = async (business, phone, payload, type = 'text') => {
    return await axios({
        method: 'POST',
        url: `https://graph.facebook.com/v20.0/${business.whatsappPhoneId}/messages`,
        headers: { 
            'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
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

const verifyCustomerToken = async (customerToken) => {
    const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,name&access_token=${customerToken}`, 
        { timeout: 10000 }
    );
    return response.data;
};

// ==========================================
// 🗄️ HELPER FUNCTIONS (DATABASE OPERATIONS)
// ==========================================

/**
 * 🔥🔥🔥 SULUHISHO KUU: KULAZIMISHA `updatedAt` KABISA 🔥🔥🔥
 * 
 * Tatizo: Baada ya kuongeza `updatedAt` kwenye schema.prisma na kufanya 
 * `npx prisma db push`, database inakataa thamani tupu (null) kwenye `updatedAt`.
 * 
 * Suluhisho: Tunapeleka `updatedAt: new Date()` kwa mikono yetu wenyewe
 * badala ya kumtegemea Prisma afanye auto-magic.
 */

/**
 * 🗄️ HELPER: Tafuta au tengeneza contact - KWA KULAZIMISHA `updatedAt`
 */
const findOrCreateContact = async (businessId, phoneNumber, name) => {
    let contact = await prisma.contact.findFirst({ 
        where: { businessId, phoneNumber } 
    });
    
    if (!contact) {
        const now = new Date(); // 🔥 Tunaforce muda wetu wenyewe!
        contact = await prisma.contact.create({ 
            data: { 
                businessId, 
                phoneNumber, 
                name: name || phoneNumber,
                updatedAt: now  // 🔥 LAZIMISHA updatedAt - hii inamaliza NULL error!
            } 
        });
    }
    
    return contact;
};

/**
 * 🗄️ HELPER: Hifadhi ujumbe kwa usalama - KWA KULAZIMISHA `updatedAt`
 * Hii inatumia findFirst + update/create na inaforce `updatedAt` kila mahali
 */
const saveMessageSafe = async (messageData) => {
    const { metaMsgId, businessId, contactId, direction, content, status } = messageData;
    const now = new Date(); // 🔥 Tunaforce muda wetu wenyewe!
    
    try {
        // Angalia kama message tayari ipo
        const existingMsg = await prisma.message.findFirst({ where: { metaMsgId } });
        
        if (existingMsg) {
            return await prisma.message.update({
                where: { id: existingMsg.id },
                data: { 
                    status, 
                    content,
                    updatedAt: now  // 🔥 LAZIMISHA updatedAt!
                }
            });
        } else {
            return await prisma.message.create({
                data: { 
                    businessId, 
                    contactId, 
                    metaMsgId, 
                    direction, 
                    content, 
                    status,
                    updatedAt: now  // 🔥 LAZIMISHA updatedAt - hii inamaliza NULL error!
                }
            });
        }
    } catch (dbError) {
        // 🔥 Tunaloga lakini haturushi error kwa Meta counter
        console.error(`⚠️ [DB SAVE WARNING] Imeshindwa kuhifadhi kwenye database: ${dbError.message}`);
        console.error(`   └─ metaMsgId: ${metaMsgId}, contactId: ${contactId}`);
        console.error(`   └─ Error full: ${dbError.stack}`);
        return null; // Return null, Meta tayari imetuma!
    }
};

// ========================================================
// ⚡ SOCKET.IO ENGINE
// ========================================================
io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error("Huruhusiwi."));
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Tiketi imekwisha."));
        socket.businessId = decoded.businessId; 
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`🔌 [SOCKET LIVE] Ofisi: ${socket.businessId}`);
    socket.join(socket.businessId);
    socket.on('disconnect', () => console.log(`🔴 [SOCKET OFF] Ofisi: ${socket.businessId}`));
});

// ==========================================
// 📊 3. DASHBOARD STATS
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
        res.json({ 
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
        console.error("❌ [Stats]:", error.message);
        res.status(500).json({ success: false, error: "Imeshindwa kuvuta takwimu." }); 
    }
});

// ==========================================
// 💰 4. WALLET BALANCE
// ==========================================
app.get('/api/wallet/balance', verifyToken, async (req, res) => {
    try {
        const business = await prisma.business.findUnique({ 
            where: { id: req.user.businessId },
            select: { walletBalance: true, businessName: true }
        });
        if (!business) return res.status(404).json({ success: false, error: "Haijapatikana." });
        res.json({ success: true, walletBalance: business.walletBalance, businessName: business.businessName });
    } catch (error) {
        res.status(500).json({ success: false, error: "Imeshindwa." });
    }
});

// ==========================================
// 🔐 5. AUTHENTICATION
// ==========================================
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { businessName, fullName, phone, password } = req.body;
        if (!phone || !password) return res.status(400).json({ success: false, error: "Namba na nenosiri ni lazima." });
        if (password.length < 6) return res.status(400).json({ success: false, error: "Nenosiri liwe na herufi 6+." });

        const exists = await prisma.business.findFirst({ where: { phone } });
        if (exists) return res.status(409).json({ success: false, error: "Namba imeshasajiliwa." });

        const hashedPassword = await bcrypt.hash(password, 12);
        const now = new Date();
        await prisma.business.create({
            data: { 
                businessName: businessName || 'Biashara', 
                fullName: fullName || 'Mtumiaji', 
                phone, 
                password: hashedPassword, 
                walletBalance: 0.0, 
                createdAt: now,
                updatedAt: now  // 🔥 LAZIMISHA updatedAt!
            }
        });
        console.log(`🎊 [MTEJA MPYA] ${businessName} | +${phone}`);
        res.status(201).json({ success: true, message: "Usajili umekamilika!" });
    } catch (error) { 
        console.error("❌ [Register]:", error.message);
        res.status(500).json({ success: false, error: "Hitilafu wakati wa usajili." }); 
    }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { phone, password } = req.body;
        if (!phone || !password) return res.status(400).json({ success: false, error: "Namba na nenosiri ni lazima." });

        const business = await prisma.business.findFirst({ where: { phone } });
        if (!business) return res.status(401).json({ success: false, error: "Namba haijasajiliwa." });
        if (!business.password) return res.status(401).json({ success: false, error: "Tumia Facebook Login." });

        const isMatch = await bcrypt.compare(password, business.password);
        if (!isMatch) return res.status(401).json({ success: false, error: "Nenosiri sio sahihi." });

        const token = jwt.sign({ businessId: business.id }, JWT_SECRET, { expiresIn: '7d' });
        console.log(`🔓 [LOGIN] ${business.businessName}`);
        res.json({ 
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
        console.error("❌ [Login]:", error.message);
        res.status(500).json({ success: false, error: "Hitilafu kwenye Server." }); 
    }
});

// 🔥 FACEBOOK LOGIN
app.post('/api/auth/facebook-login', authLimiter, async (req, res) => {
    try {
        const { accessToken: codeOrToken } = req.body;
        if (!codeOrToken) return res.status(400).json({ success: false, error: "Access Token inahitajika." });

        let finalToken = codeOrToken;
        if (!codeOrToken.startsWith('EAA')) {
            try {
                const tokenRes = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
                    params: { client_id: META_APP_ID, client_secret: META_APP_SECRET, code: codeOrToken },
                    timeout: 10000
                });
                finalToken = tokenRes.data.access_token;
            } catch (error) {
                return res.status(400).json({ success: false, error: "Imeshindwa kubadilisha code ya Meta." });
            }
        }

        let fbUser;
        try {
            fbUser = await verifyCustomerToken(finalToken);
        } catch (error) {
            return res.status(401).json({ success: false, error: "Imeshindwa kuthibitisha akaunti ya Facebook." });
        }
        console.log(`✅ [META] ${fbUser.name} (${fbUser.id})`);

        let wabaId = null, phoneId = null;

        // Tafuta WABA kupitia Debug Token
        try {
            const debugRes = await axios.get('https://graph.facebook.com/v20.0/debug_token', {
                params: { input_token: finalToken, access_token: `${META_APP_ID}|${META_APP_SECRET}` },
                timeout: 10000
            });
            const scopes = debugRes.data?.data?.granular_scopes || [];
            const wabaScope = scopes.find(s => s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging');
            if (wabaScope?.target_ids?.length > 0) wabaId = wabaScope.target_ids[0];
        } catch(e) {}

        // Njia mbadala
        if (!wabaId) {
            try {
                const bizRes = await axios.get('https://graph.facebook.com/v20.0/me/businesses', { params: { access_token: finalToken }, timeout: 10000 });
                for (const biz of bizRes.data?.data || []) {
                    try {
                        const ownedRes = await axios.get(`https://graph.facebook.com/v20.0/${biz.id}/owned_whatsapp_business_accounts`, { params: { access_token: finalToken }, timeout: 10000 });
                        if (ownedRes.data?.data?.length > 0) { wabaId = ownedRes.data.data[0].id; break; }
                        const clientRes = await axios.get(`https://graph.facebook.com/v20.0/${biz.id}/client_whatsapp_business_accounts`, { params: { access_token: finalToken }, timeout: 10000 });
                        if (clientRes.data?.data?.length > 0) { wabaId = clientRes.data.data[0].id; break; }
                    } catch(err) { continue; }
                }
            } catch(e) {}
        }

        // Vuta Phone ID
        if (wabaId) {
            try {
                const phoneRes = await axios.get(`https://graph.facebook.com/v20.0/${wabaId}/phone_numbers`, { params: { access_token: finalToken }, timeout: 10000 });
                if (phoneRes.data?.data?.length > 0) phoneId = phoneRes.data.data[0].id;
            } catch(e) {}
        }

        const now = new Date();
        let business = await prisma.business.findUnique({ where: { facebookId: fbUser.id } });
        
        if (!business) {
            const createData = { 
                businessName: `${fbUser.name} Business`, 
                fullName: fbUser.name, 
                facebookId: fbUser.id, 
                metaAccessToken: finalToken, 
                walletBalance: 0.0, 
                createdAt: now,
                updatedAt: now  // 🔥 LAZIMISHA updatedAt!
            };
            if (wabaId) createData.wabaId = wabaId;
            if (phoneId) createData.whatsappPhoneId = phoneId;
            business = await prisma.business.create({ data: createData });
        } else {
            const updateData = { 
                metaAccessToken: finalToken,
                updatedAt: now  // 🔥 LAZIMISHA updatedAt!
            };
            if (wabaId) updateData.wabaId = wabaId;
            if (phoneId) updateData.whatsappPhoneId = phoneId;
            business = await prisma.business.update({ where: { id: business.id }, data: updateData });
        }

        const token = jwt.sign({ businessId: business.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
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
// ⚙️ 6. SETTINGS
// ==========================================
app.post('/api/settings/update', verifyToken, async (req, res) => {
    try {
        const { whatsappPhoneId } = req.body;
        if (!whatsappPhoneId?.trim()) return res.status(400).json({ success: false, error: "Phone ID inahitajika." });
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        if (!business) return res.status(404).json({ success: false, error: "Haijapatikana." });
        if (business.whatsappPhoneId && business.whatsappPhoneId !== whatsappPhoneId.trim()) {
            return res.status(403).json({ success: false, error: "Imefungwa. Wasiliana na Admin." });
        }
        await prisma.business.update({ 
            where: { id: req.user.businessId }, 
            data: { 
                whatsappPhoneId: whatsappPhoneId.trim(),
                updatedAt: new Date()  // 🔥 LAZIMISHA updatedAt!
            } 
        });
        res.json({ success: true, message: "Phone ID imeunganishwa!" });
    } catch (error) { 
        res.status(500).json({ success: false, error: "Hitilafu." }); 
    }
});

// ==========================================
// 📡 7. WEBHOOK
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
                        await prisma.message.updateMany({ 
                            where: { metaMsgId: statusObj.id }, 
                            data: { 
                                status: statusObj.status.toUpperCase(),
                                updatedAt: new Date()  // 🔥 LAZIMISHA updatedAt!
                            } 
                        });
                        io.to(business.id).emit('messageStatusUpdate', { 
                            metaMsgId: statusObj.id, 
                            status: statusObj.status.toUpperCase() 
                        });
                    }
                }

                // Incoming messages
                if (value.messages?.length > 0) {
                    for (const message of value.messages) {
                        const phoneNumber = message.from;
                        const customerName = value.contacts?.[0]?.profile?.name || phoneNumber;
                        let msgBody = message.type === 'text' ? message.text.body : 
                                     message.type === 'button' ? message.button?.text || '[Kitufe]' : 
                                     message.type === 'interactive' ? message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '[Mwitikio]' : 
                                     `📎 [${message.type}]`;

                        const dbContact = await findOrCreateContact(business.id, phoneNumber, customerName);
                        const savedMsg = await saveMessageSafe({ 
                            metaMsgId: message.id, 
                            businessId: business.id, 
                            contactId: dbContact.id, 
                            direction: 'INBOUND', 
                            content: msgBody, 
                            status: 'RECEIVED' 
                        });

                        if (savedMsg) {
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
        }
    } catch (error) { 
        console.error('❌ [Webhook]:', error.message); 
    }
});

// ==========================================
// 📱 8. LIVE CHAT
// ==========================================
app.get('/api/chat/contacts', verifyToken, async (req, res) => {
    try {
        const contacts = await prisma.contact.findMany({ 
            where: { businessId: req.user.businessId }, 
            include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } } 
        });
        const formatted = await Promise.all(contacts.filter(c => c.messages.length > 0).map(async c => ({
            id: c.id, 
            name: c.name || c.phoneNumber, 
            phone: c.phoneNumber,
            lastMsg: c.messages[0]?.content || '...', 
            time: c.messages[0]?.createdAt,
            unread: await prisma.message.count({ where: { contactId: c.id, direction: 'INBOUND', status: 'RECEIVED' } }),
            lastSender: c.messages[0]?.direction === 'OUTBOUND' ? 'me' : 'them', 
            lastStatus: c.messages[0]?.status
        })));
        formatted.sort((a, b) => new Date(b.time) - new Date(a.time));
        res.json({ success: true, contacts: formatted });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

app.get('/api/chat/messages/:contactId', verifyToken, async (req, res) => {
    try {
        const { contactId } = req.params;
        const businessId = req.user.businessId;
        await prisma.message.updateMany({ 
            where: { contactId, businessId, direction: 'INBOUND', status: 'RECEIVED' }, 
            data: { 
                status: 'READ',
                updatedAt: new Date()  // 🔥 LAZIMISHA updatedAt!
            } 
        });
        const messages = await prisma.message.findMany({ 
            where: { contactId, businessId }, 
            orderBy: { createdAt: 'asc' } 
        });
        res.json({ 
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
        res.status(500).json({ error: error.message }); 
    }
});

app.post('/api/chat/send', verifyToken, async (req, res) => {
    try {
        const { contactId, phone, messageText } = req.body;
        if (!phone || !messageText?.trim() || !contactId) return res.status(400).json({ success: false, error: "Taarifa hazijakamilika." });
        
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        if (!business) return res.status(404).json({ success: false, error: "Akaunti haijapatikana." });
        if (!business.whatsappPhoneId) return res.status(403).json({ success: false, error: "Phone ID haijaunganishwa." });
        if (business.walletBalance < LIVE_CHAT_COST) return res.status(402).json({ success: false, error: `Salio halitoshi. Unahitaji TZS ${LIVE_CHAT_COST}.` });

        // 1. TUMA META KWANZA
        const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, messageText.trim(), 'text');
        const metaMsgId = metaRes.data.messages[0].id;

        // 2. HIFADHI DATABASE (Kwa kulazimisha updatedAt)
        const savedMsg = await saveMessageSafe({ 
            metaMsgId, 
            businessId: business.id, 
            contactId, 
            direction: 'OUTBOUND', 
            content: messageText.trim(), 
            status: 'SENT' 
        });
        
        // 3. UPDATE WALLET
        const updatedBiz = await prisma.business.update({ 
            where: { id: business.id }, 
            data: { 
                walletBalance: { decrement: LIVE_CHAT_COST },
                updatedAt: new Date()  // 🔥 LAZIMISHA updatedAt!
            } 
        });

        console.log(`💬 [LIVE CHAT] ${business.businessName} -> +${phone} | Salio: TZS ${updatedBiz.walletBalance}`);
        
        if (savedMsg) {
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
        }
        io.to(business.id).emit('walletUpdate', { newBalance: updatedBiz.walletBalance });

        res.json({ success: true, message: 'Imetumwa', newBalance: updatedBiz.walletBalance });
    } catch (error) { 
        const errMsg = error.response?.data?.error?.message || '';
        const errCode = error.response?.data?.error?.code;
        if (errMsg.includes('24 hour') || errCode === 131047) return res.status(400).json({ success: false, error: "Masaa 24 yameisha. Tumia Template." });
        if (errMsg.includes('access token') || errCode === 190) return res.status(401).json({ success: false, error: "Hitilafu ya uthibitisho na Meta." });
        res.status(500).json({ success: false, error: "Imeshindikana kutuma." }); 
    }
});

// ==========================================
// 🚀 9. BULK SMS ENGINE - UPDATED AT FORCED 🔥🔥🔥
// ==========================================
app.post('/api/send-bulk', verifyToken, async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { contacts, campaignName, templateName, templateLanguage, headerImageUrl } = req.body; 
        if (!contacts?.length) return res.status(400).json({ success: false, error: "Namba za wateja hazipo." });

        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        if (!business) return res.status(404).json({ success: false, error: "Akaunti haijapatikana." });
        if (!business.whatsappPhoneId) return res.status(403).json({ success: false, error: "Phone ID haijaunganishwa." });
        
        const totalEstimatedCost = contacts.length * BULK_SMS_COST;
        if (business.walletBalance < totalEstimatedCost) {
            return res.status(402).json({ 
                success: false, 
                error: `Salio halitoshi. Unahitaji TZS ${totalEstimatedCost}. Salio: TZS ${business.walletBalance}` 
            });
        }

        console.log(`\n┏━━━━━━━━━━━━━━━━ 🚀 KAMPENI MPYA ━━━━━━━━━━━━━━━━┓`);
        console.log(`┃ BIASHARA    : ${business.businessName}`);
        console.log(`┃ WATEJA      : ${contacts.length} | GHARAMA: TZS ${totalEstimatedCost}`);
        console.log(`┃ MFUMO       : Isolated DB + Forced updatedAt ✅`);
        console.log(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`);
        
        let metaSuccessCount = 0;
        let metaFailedCount = 0;
        let dbSaveFailedCount = 0;
        const failedNumbers = [];

        for (const phone of contacts) {
            let metaMsgId = null;
            let metaSent = false;
            
            // ==========================================
            // HATUA YA 1: TUMA KWA META (INDEPENDENT)
            // ==========================================
            try {
                const templatePayload = { 
                    name: templateName || "hello_world", 
                    language: { code: templateLanguage || "sw" } 
                };
                if (headerImageUrl?.trim()) {
                    templatePayload.components = [{ 
                        type: "header", 
                        parameters: [{ type: "image", image: { link: headerImageUrl.trim() } }] 
                    }];
                }

                const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, templatePayload, 'template');
                metaMsgId = metaRes.data.messages[0].id;
                metaSuccessCount++;
                metaSent = true;
                process.stdout.write('✅ ');
                
            } catch (metaError) {
                metaFailedCount++;
                process.stdout.write('❌ ');
                const errMsg = metaError.response?.data?.error?.message || metaError.message;
                const errCode = metaError.response?.data?.error?.code;
                failedNumbers.push({ phone, reason: errMsg.substring(0, 80), code: errCode || 'UNKNOWN' });
                
                if (errCode === 190 || errMsg.includes('access token')) {
                    console.error('\n⚠️ [TOKEN ERROR] Inasimamisha kampeni.');
                    break;
                }
                continue;
            }

            // ==========================================
            // HATUA YA 2: HIFADHI KWA DATABASE (INDEPENDENT)
            // ==========================================
            if (metaSent && metaMsgId) {
                try {
                    const dbContact = await findOrCreateContact(business.id, phone, phone);
                    const saved = await saveMessageSafe({
                        metaMsgId,
                        businessId: business.id,
                        contactId: dbContact.id,
                        direction: 'OUTBOUND',
                        content: `📢 [${campaignName || 'Kampeni'}] - ${templateName}`,
                        status: 'SENT'
                    });
                    
                    if (!saved) {
                        dbSaveFailedCount++;
                        console.warn(`   ⚠️ [DB] Haijahifadhiwa: +${phone}`);
                    }
                } catch (dbError) {
                    dbSaveFailedCount++;
                    console.error(`   ⚠️ [DB ERROR] +${phone}: ${dbError.message}`);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const actualCost = metaSuccessCount * BULK_SMS_COST;
        let newBalance = business.walletBalance;
        
        if (actualCost > 0) {
            const updated = await prisma.business.update({ 
                where: { id: business.id }, 
                data: { 
                    walletBalance: { decrement: actualCost },
                    updatedAt: new Date()  // 🔥 LAZIMISHA updatedAt!
                } 
            });
            newBalance = updated.walletBalance;
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`\n╔════════════════ 🏁 KAMPENI IMEKAMILIKA ════════════════╗`);
        console.log(`║ 📊 RIPOTI (updatedAt Forced ✅):`);
        console.log(`║    ✅ Meta Imetuma      : ${metaSuccessCount}/${contacts.length}`);
        console.log(`║    ❌ Meta Imeshindwa   : ${metaFailedCount}`);
        console.log(`║    ⚠️ DB Haijahifadhi    : ${dbSaveFailedCount}`);
        console.log(`║    💰 Gharama           : TZS ${actualCost}`);
        console.log(`║    🏦 Salio Mpya        : TZS ${newBalance}`);
        console.log(`║    ⏱️  Muda              : ${duration}s`);
        console.log(`╚════════════════════════════════════════════════════════╝\n`);

        io.to(business.id).emit('campaignComplete', {
            campaignName: campaignName || 'Kampeni',
            stats: { total: contacts.length, success: metaSuccessCount, failed: metaFailedCount, dbSaveFailed: dbSaveFailedCount, duration },
            newBalance
        });

        res.status(200).json({ 
            success: true, 
            message: `Kampeni imekamilika. Meta: ${metaSuccessCount}/${contacts.length} zimefika.${dbSaveFailedCount > 0 ? ` (${dbSaveFailedCount} hazijahifadhiwa Live Chat)` : ''}`,
            stats: { 
                total: contacts.length, 
                success: metaSuccessCount,
                failed: metaFailedCount,
                dbSaveFailed: dbSaveFailedCount,
                duration 
            }, 
            newBalance,
            failedNumbers: failedNumbers.slice(0, 10)
        });
        
    } catch (error) { 
        console.error('❌ [Bulk SMS Fatal Error]:', error.message);
        res.status(500).json({ success: false, error: "Hitilafu imetokea. Tafadhali jaribu tena." }); 
    }
});

// ==========================================
// 🏠 10. HEALTH CHECK
// ==========================================
app.get('/', (req, res) => { 
    res.status(200).json({ 
        status: "Online 🟢", 
        version: "2.5.0",
        architecture: "Isolated Meta + Database | Forced updatedAt",
        fix: "Null constraint violation on updatedAt - SOLVED",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    }); 
});

// ==========================================
// 🚦 11. GLOBAL ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
    console.error("🚨 [UNHANDLED ERROR]:", err.stack || err.message);
    if (res.headersSent) return next(err);
    res.status(500).json({ success: false, error: "Hitilafu isiyotarajiwa.", reference: Date.now() });
});

// ==========================================
// 🚀 12. START SERVER
// ==========================================
server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(` 🚀 KEDESH SAAS BACKEND v2.5.0 IMESIMAMA IMARA `);
    console.log(`=============================================================`);
    console.log(` 🟢 PORT          : ${PORT}`);
    console.log(` 🏢 MUUNDO        : Isolated Meta + Forced updatedAt`);
    console.log(` 🔑 MFUMO         : updatedAt inalazimishwa kila mahali`);
    console.log(` 💰 LIVE CHAT     : TZS ${LIVE_CHAT_COST}/ujumbe`);
    console.log(` 💰 BULK SMS      : TZS ${BULK_SMS_COST}/ujumbe`);
    console.log(` 🛡️ FIX           : Null constraint on updatedAt - IMETATULIWA!`);
    console.log(` 📝 CHANGELOG     : v2.5.0 - Forced updatedAt on ALL Prisma operations`);
    console.log(`=============================================================\n`);
});

// ==========================================
// 🛑 13. GRACEFUL SHUTDOWN
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
    console.error('🚨 [UNCAUGHT EXCEPTION]:', error.stack);
    process.exit(1);
});