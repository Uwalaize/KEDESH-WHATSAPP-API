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

const BULK_SMS_COST = 84;
const LIVE_CHAT_COST = 30;

const { META_VERIFY_TOKEN, META_ACCESS_TOKEN, META_APP_ID, META_APP_SECRET } = process.env;
const JWT_SECRET = process.env.JWT_SECRET || "KEDESH_LIMITED_PREMIUM_SECRET_2026"; 

if (!META_VERIFY_TOKEN || !META_ACCESS_TOKEN || !META_APP_ID || !META_APP_SECRET) {
    console.error("\n🚨 [KOSA KUBWA LAKIUSALAMA] 🚨");
    console.error("Funguo za Meta hazijakamilika kwenye .env\n");
    process.exit(1); 
}

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
// 🗄️ DATABASE HELPERS
// ==========================================
const findOrCreateContact = async (businessId, phoneNumber, name) => {
    let contact = await prisma.contact.findFirst({ where: { businessId, phoneNumber } });
    if (!contact) {
        contact = await prisma.contact.create({ data: { businessId, phoneNumber, name: name || phoneNumber } });
    }
    return contact;
};

const saveMessageSafe = async (messageData) => {
    const { metaMsgId, businessId, contactId, direction, content, status, messageType } = messageData;
    try {
        return await prisma.message.upsert({
            where: { metaMsgId: metaMsgId || `sys_${Date.now()}` },
            update: { status, content },
            create: { businessId, contactId, metaMsgId, direction, content, status, messageType: messageType || 'text' }
        });
    } catch (dbError) {
        console.error(`⚠️ [DB SAVE WARNING] Imeshindwa kuhifadhi: ${dbError.message}`);
        return null;
    }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
// 📊 DASHBOARD STATS
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
        res.json({ success: true, stats: { totalContacts, totalSent, totalDelivered, totalFailed, walletBalance: business?.walletBalance || 0 } });
    } catch (error) { res.status(500).json({ success: false, error: "Imeshindwa kuvuta takwimu." }); }
});

app.get('/api/wallet/balance', verifyToken, async (req, res) => {
    try {
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId }, select: { walletBalance: true, businessName: true } });
        if (!business) return res.status(404).json({ success: false, error: "Haijapatikana." });
        res.json({ success: true, walletBalance: business.walletBalance, businessName: business.businessName });
    } catch (error) { res.status(500).json({ success: false, error: "Imeshindwa." }); }
});

// ==========================================
// 🔐 AUTHENTICATION
// ==========================================
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { businessName, fullName, phone, password } = req.body;
        if (!phone || !password) return res.status(400).json({ success: false, error: "Namba na nenosiri ni lazima." });

        const exists = await prisma.business.findFirst({ where: { phone } });
        if (exists) return res.status(409).json({ success: false, error: "Namba imeshasajiliwa." });

        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.business.create({
            data: { businessName: businessName || 'Biashara', fullName: fullName || 'Mtumiaji', phone, password: hashedPassword, walletBalance: 0.0 }
        });
        res.status(201).json({ success: true, message: "Usajili umekamilika!" });
    } catch (error) { res.status(500).json({ success: false, error: "Hitilafu wakati wa usajili." }); }
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
        res.json({ success: true, token, user: { id: business.id, businessName: business.businessName, fullName: business.fullName, phone: business.phone, walletBalance: business.walletBalance, whatsappPhoneId: business.whatsappPhoneId, wabaId: business.wabaId, isFacebookConnected: !!business.facebookId } });
    } catch (error) { res.status(500).json({ success: false, error: "Hitilafu kwenye Server." }); }
});

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
        try { fbUser = await verifyCustomerToken(finalToken); } 
        catch (error) { return res.status(401).json({ success: false, error: "Imeshindwa kuthibitisha akaunti." }); }

        let wabaId = null, phoneId = null;

        try {
            const debugRes = await axios.get('https://graph.facebook.com/v20.0/debug_token', {
                params: { input_token: finalToken, access_token: `${META_APP_ID}|${META_APP_SECRET}` }, timeout: 10000
            });
            const scopes = debugRes.data?.data?.granular_scopes || [];
            const wabaScope = scopes.find(s => s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging');
            if (wabaScope?.target_ids?.length > 0) wabaId = wabaScope.target_ids[0];
        } catch(e) {}

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

        if (wabaId) {
            try {
                const phoneRes = await axios.get(`https://graph.facebook.com/v20.0/${wabaId}/phone_numbers`, { params: { access_token: finalToken }, timeout: 10000 });
                if (phoneRes.data?.data?.length > 0) phoneId = phoneRes.data.data[0].id;
            } catch(e) {}
        }

        let business = await prisma.business.findUnique({ where: { facebookId: fbUser.id } });
        
        if (!business) {
            const createData = { businessName: `${fbUser.name} Business`, fullName: fbUser.name, facebookId: fbUser.id, metaAccessToken: finalToken, walletBalance: 0.0 };
            if (wabaId) createData.wabaId = wabaId;
            if (phoneId) createData.whatsappPhoneId = phoneId;
            business = await prisma.business.create({ data: createData });
        } else {
            const updateData = { metaAccessToken: finalToken };
            if (wabaId) updateData.wabaId = wabaId;
            if (phoneId) updateData.whatsappPhoneId = phoneId;
            business = await prisma.business.update({ where: { id: business.id }, data: updateData });
        }

        const token = jwt.sign({ businessId: business.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { id: business.id, businessName: business.businessName, fullName: business.fullName, walletBalance: business.walletBalance, whatsappPhoneId: business.whatsappPhoneId, wabaId: business.wabaId, isFacebookConnected: true } });
    } catch (error) { res.status(500).json({ success: false, error: "Imeshindwa kuwasiliana na Meta." }); }
});

app.post('/api/settings/update', verifyToken, async (req, res) => {
    try {
        const { whatsappPhoneId } = req.body;
        if (!whatsappPhoneId?.trim()) return res.status(400).json({ success: false, error: "Phone ID inahitajika." });
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        if (!business) return res.status(404).json({ success: false, error: "Haijapatikana." });
        await prisma.business.update({ where: { id: req.user.businessId }, data: { whatsappPhoneId: whatsappPhoneId.trim() } });
        res.json({ success: true, message: "Phone ID imeunganishwa!" });
    } catch (error) { res.status(500).json({ success: false, error: "Hitilafu." }); }
});

// ==========================================
// 📡 7. AGGRESSIVE WEBHOOK (INAANIKA KILA KITU) 🔥
// ==========================================
app.get('/webhook', (req, res) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
        console.log('🟢 [WEBHOOK] Meta imeidhinisha URL yetu kikamilifu!');
        return res.status(200).send(challenge);
    }
    console.log('🔴 [WEBHOOK] Meta imekataliwa. Token haifanani.');
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    res.sendStatus(200); // Jibu Meta haraka sana!
    
    console.log(`\n🔔 [WEBHOOK INAINGIA] Mzigo toka Meta Umefika!`);

    try {
        const body = req.body;
        if (body?.object !== 'whatsapp_business_account') {
            console.log(`⚠️ [WEBHOOK] Sio taarifa za WhatsApp. Imetupwa.`);
            return;
        }

        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                const value = change.value;
                if (!value) continue;

                const incomingPhoneId = value.metadata?.phone_number_id;
                if (!incomingPhoneId) {
                    continue;
                }

                console.log(`🔍 [WEBHOOK] Natafuta Biashara yenye Phone ID: ${incomingPhoneId}`);
                const business = await prisma.business.findFirst({ where: { whatsappPhoneId: incomingPhoneId } });
                
                if (!business) {
                    console.log(`❌ [WEBHOOK] Biashara haijapatikana kwa Phone ID hii. Imetupwa.`);
                    continue;
                }

                // A) KUKAMATA TIKI ZA BLUE / STATUS UPDATES
                if (value.statuses?.length > 0) {
                    for (const statusObj of value.statuses) {
                        const newStatus = statusObj.status.toUpperCase();
                        
                        // Tunasubiri sekunde 1 ili Mfumo wa Bulk umalize kusave Meseji Kwanza (Race Condition Fix)
                        let existingMsg = await prisma.message.findFirst({ where: { metaMsgId: statusObj.id } });
                        if(!existingMsg) {
                            await sleep(1000); 
                            existingMsg = await prisma.message.findFirst({ where: { metaMsgId: statusObj.id } });
                        }

                        if(existingMsg) {
                            await prisma.message.update({ where: { id: existingMsg.id }, data: { status: newStatus } });
                            io.to(business.id).emit('messageStatusUpdate', { metaMsgId: statusObj.id, status: newStatus });
                            console.log(`   ✅ [TIKI LIVE] -> ${newStatus}`);
                        } else {
                            console.log(`   ⚠️ [TIKI IGNORED] Meseji ID: ${statusObj.id} haipo kwenye DB yetu.`);
                        }
                    }
                }

                // B) KUKAMATA MESEJI MTEJA AKIJIBU (INBOUND)
                if (value.messages?.length > 0) {
                    for (const message of value.messages) {
                        const phoneNumber = message.from;
                        const customerName = value.contacts?.[0]?.profile?.name || phoneNumber;
                        let msgBody = message.type === 'text' ? message.text.body : `📎 [Faili: ${message.type}]`;

                        console.log(`   📥 [INBOX KUTOKA MTEJA] +${phoneNumber} -> "${msgBody}"`);

                        const dbContact = await findOrCreateContact(business.id, phoneNumber, customerName);
                        const savedMsg = await saveMessageSafe({ 
                            metaMsgId: message.id, 
                            businessId: business.id, 
                            contactId: dbContact.id, 
                            direction: 'INBOUND', 
                            content: msgBody, 
                            status: 'RECEIVED',
                            messageType: message.type 
                        });

                        if (savedMsg) {
                            io.to(business.id).emit('newIncomingMessage', { 
                                contactId: dbContact.id, 
                                contactName: customerName, 
                                phoneNumber, 
                                message: { id: savedMsg.id, content: savedMsg.content, direction: savedMsg.direction, status: savedMsg.status, createdAt: savedMsg.createdAt } 
                            });
                            console.log(`   ✅ [INBOX] Ujumbe umeingia kwenye Live Chat ya ${business.businessName}!`);
                        }
                    }
                }
            }
        }
    } catch (error) { 
        console.error('❌ [Webhook Fatal Error]:', error.message); 
    }
});

// ==========================================
// 📱 8. LIVE CHAT API
// ==========================================
app.get('/api/chat/contacts', verifyToken, async (req, res) => {
    try {
        const contacts = await prisma.contact.findMany({ where: { businessId: req.user.businessId }, include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } } });
        const formatted = await Promise.all(contacts.filter(c => c.messages.length > 0).map(async c => ({
            id: c.id, name: c.name || c.phoneNumber, phone: c.phoneNumber, lastMsg: c.messages[0]?.content || '...', time: c.messages[0]?.createdAt,
            unread: await prisma.message.count({ where: { contactId: c.id, direction: 'INBOUND', status: 'RECEIVED' } }),
            lastSender: c.messages[0]?.direction === 'OUTBOUND' ? 'me' : 'them', lastStatus: c.messages[0]?.status
        })));
        formatted.sort((a, b) => new Date(b.time) - new Date(a.time));
        res.json({ success: true, contacts: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/chat/messages/:contactId', verifyToken, async (req, res) => {
    try {
        await prisma.message.updateMany({ where: { contactId: req.params.contactId, businessId: req.user.businessId, direction: 'INBOUND', status: 'RECEIVED' }, data: { status: 'READ' } });
        const messages = await prisma.message.findMany({ where: { contactId: req.params.contactId, businessId: req.user.businessId }, orderBy: { createdAt: 'asc' } });
        res.json({ success: true, messages: messages.map(m => ({ id: m.id, content: m.content, direction: m.direction, status: m.status, createdAt: m.createdAt })) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/chat/send', verifyToken, async (req, res) => {
    try {
        const { contactId, phone, messageText } = req.body;
        if (!phone || !messageText?.trim() || !contactId) return res.status(400).json({ success: false, error: "Taarifa hazijakamilika." });
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });

        if (!business.whatsappPhoneId) return res.status(403).json({ success: false, error: "Phone ID haijaunganishwa." });
        if (business.walletBalance < LIVE_CHAT_COST) return res.status(402).json({ success: false, error: "Salio halitoshi." });

        const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, messageText.trim(), 'text');
        const metaMsgId = metaRes.data.messages[0].id;

        const savedMsg = await saveMessageSafe({ metaMsgId, businessId: business.id, contactId, direction: 'OUTBOUND', content: messageText.trim(), status: 'SENT', messageType: 'text' });
        const updatedBiz = await prisma.business.update({ where: { id: business.id }, data: { walletBalance: { decrement: LIVE_CHAT_COST } } });

        if (savedMsg) {
            io.to(business.id).emit('newIncomingMessage', { contactId, contactName: 'You', phoneNumber: phone, message: { id: savedMsg.id, content: savedMsg.content, direction: savedMsg.direction, status: savedMsg.status, createdAt: savedMsg.createdAt } });
        }
        io.to(business.id).emit('walletUpdate', { newBalance: updatedBiz.walletBalance });

        res.json({ success: true, message: 'Imetumwa', newBalance: updatedBiz.walletBalance });
    } catch (error) { res.status(500).json({ success: false, error: "Imeshindikana kutuma." }); }
});

// ==========================================
// 🚀 9. BULK SMS ENGINE
// ==========================================
app.post('/api/send-bulk', verifyToken, async (req, res) => {
    const startTime = Date.now();
    try {
        const { contacts, campaignName, templateName, templateLanguage, headerImageUrl } = req.body; 
        if (!contacts?.length) return res.status(400).json({ success: false, error: "Namba hazipo." });

        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        if (!business.whatsappPhoneId) return res.status(403).json({ success: false, error: "Phone ID haijaunganishwa." });
        
        const totalCost = contacts.length * BULK_SMS_COST;
        if (business.walletBalance < totalCost) return res.status(402).json({ success: false, error: "Salio halitoshi." });

        let metaSuccessCount = 0; let metaFailedCount = 0; const failedNumbers = [];

        for (const phone of contacts) {
            let metaMsgId = null; let metaSent = false;
            try {
                const payload = { name: templateName || "hello_world", language: { code: templateLanguage || "sw" } };
                if (headerImageUrl?.trim()) payload.components = [{ type: "header", parameters: [{ type: "image", image: { link: headerImageUrl.trim() } }] }];
                const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, payload, 'template');
                metaMsgId = metaRes.data.messages[0].id;
                metaSuccessCount++; metaSent = true;
            } catch (error) {
                metaFailedCount++;
                failedNumbers.push({ phone, reason: error.response?.data?.error?.message || error.message });
                continue;
            }

            if (metaSent && metaMsgId) {
                try {
                    const dbContact = await findOrCreateContact(business.id, phone, phone);
                    await saveMessageSafe({ metaMsgId, businessId: business.id, contactId: dbContact.id, direction: 'OUTBOUND', content: `📢 [${campaignName || 'Kampeni'}] - ${templateName}`, status: 'SENT', messageType: 'template' });
                } catch(err) {}
            }
            await new Promise(resolve => setTimeout(resolve, 300)); 
        }

        const actualCost = metaSuccessCount * BULK_SMS_COST;
        let newBalance = business.walletBalance;
        if (actualCost > 0) {
            const updated = await prisma.business.update({ where: { id: business.id }, data: { walletBalance: { decrement: actualCost } } });
            newBalance = updated.walletBalance;
        }

        io.to(business.id).emit('campaignComplete', { campaignName: campaignName || 'Kampeni', stats: { total: contacts.length, success: metaSuccessCount, failed: metaFailedCount }, newBalance });

        res.json({ success: true, message: `Kampeni imekamilika. ${metaSuccessCount}/${contacts.length} zimefika.`, stats: { total: contacts.length, success: metaSuccessCount, failed: metaFailedCount }, newBalance, failedNumbers });
    } catch (error) { res.status(500).json({ success: false, error: "Hitilafu imetokea." }); }
});

app.get('/', (req, res) => { res.json({ status: "Online 🟢", version: "2.8.0 Premium" }); });
app.use((err, req, res, next) => { res.status(500).json({ success: false, error: "Hitilafu isiyotarajiwa." }); });

server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(` 🚀 KEDESH SAAS BACKEND v2.8.0 IMESIMAMA IMARA `);
    console.log(` 🛡️ FIX: Ultimate Webhook & Race Condition Fix`);
    console.log(`=============================================================\n`);
});