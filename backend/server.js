require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
const axios = require('axios');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const { PrismaClient } = require('@prisma/client'); 
const fs = require('fs');
const path = require('path');

const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.set('trust proxy', 1);

// ============================================================================
// 🛡️ 1. ULINZI WA KIWANGO CHA JUU (SECURITY SHIELD)
// ============================================================================
app.use(helmet({ 
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false // Inaruhusu picha/video ku-load kwenye frontend vizuri
})); 

const allowedOrigins = [
    'https://admin.kedeshlimited.com', 
    'https://homebulksms.kedeshlimited.com', // 🔴 FIXED: Updated domain name
    'http://localhost:5173',
    'https://apibulksms.kedeshlimited.com' 
];

app.use(cors({
    origin: function (origin, callback) {
        // Tunaruhusu simu za kawaida au servers zenye domains zinazojulikana
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`⚠️ Mlinzi Amekataa Domain: ${origin}`);
            callback(new Error('Kizuizi cha CORS: Mfumo unakataa mawasiliano kutoka chanzo hiki.'));
        }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// ============================================================================
// 🌐 2. MIPANGILIO YA SOCKET.IO (MAWASILIANO YA MOJA KWA MOJA)
// ============================================================================
const server = http.createServer(app); 

const io = new Server(server, {
    cors: { 
        origin: allowedOrigins, 
        methods: ['GET', 'POST'],
        credentials: true
    },
    // 🔴 FIXED: Transport imebadilishwa kuruhusu 'polling' kwanza, kisha 'websocket' ili kuepuka error
    transports: ['polling', 'websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true // Support for older clients just in case
});

// ============================================================================
// ⚙️ 3. MISINGI MIKUU (CORE ENGINE & DATABASE)
// ============================================================================
const PORT = process.env.PORT || 5300; 
const prisma = new PrismaClient(); 

// Bei za Kibiashara (Business Pricing)
const BULK_SMS_COST = 84;
const LIVE_CHAT_COST = 30;

// Kuhakiki Funguo za Usalama (API Keys)
const { META_VERIFY_TOKEN, META_ACCESS_TOKEN, META_APP_ID, META_APP_SECRET } = process.env;
const JWT_SECRET = process.env.JWT_SECRET || "KEDESH_LIMITED_PREMIUM_SECRET_2026"; 

if (!META_VERIFY_TOKEN || !META_ACCESS_TOKEN || !META_APP_ID || !META_APP_SECRET) {
    console.error("\n=============================================================");
    console.error(" 🚨 [KOSA KUBWA LAKIUSALAMA] 🚨");
    console.error(" Funguo za Meta (API Keys) hazijakamilika kwenye faili la .env");
    console.error(" Mfumo hauwezi kuendelea mpaka viambatanisho hivi vikae sawa.");
    console.error("=============================================================\n");
    process.exit(1); 
}

// ============================================================================
// 📁 4. MTAMBO WA KUDHIBITI MAFAILI (FILE SYSTEM MANAGER)
// ============================================================================
const mediaDir = path.join(__dirname, 'public', 'media');
if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
    console.log('📂 [System] Folder la Media limetengenezwa kikamilifu.');
}
app.use('/media', express.static(mediaDir));

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================================================
// 🚦 5. VIZUIZI VYA SPAM (RATE LIMITERS)
// ============================================================================
const apiLimiter = rateLimit({ 
    windowMs: 1 * 60 * 1000, // Dakika 1
    max: 500, // Requests 500 kwa dakika kwa kila IP
    standardHeaders: true, 
    legacyHeaders: false,
    message: { success: false, error: "Umefikia kikomo cha kutumia API. Tafadhali subiri kwa dakika moja." }
});
app.use('/api/', apiLimiter); 

const authLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, // Dakika 15
    max: 20, // Majaribio 20
    standardHeaders: true, 
    legacyHeaders: false,
    message: { success: false, error: "Umejaribu kuingia mara nyingi mno. Kwa usalama, subiri dakika 15." } 
});

// Kazi maalum ya kulinda routes (Middleware)
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ success: false, error: "Tiketi ya kuingia inahitajika." });
    
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(403).json({ success: false, error: "Muundo wa tiketi si sahihi." });
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            const msg = err.name === 'TokenExpiredError' ? "Tiketi imekwisha muda wake." : "Tiketi hii si halali.";
            return res.status(401).json({ success: false, error: `${msg} Tafadhali ingia upya kwenye mfumo.` });
        }
        req.user = decoded; 
        next();
    });
};

// ============================================================================
// 🤖 6. INJINI YA META API (META CLOUD API COMMUNICATION)
// ============================================================================
const sendWhatsAppMessageAsAdmin = async (business, phone, payload, type = 'text') => {
    // Kusafisha namba na kutoa alama zinazokataliwa na Meta
    const cleanPhone = phone.replace('+', '');
    
    // Kutambua Token ya kutumia
    const activeToken = business.metaAccessToken || META_ACCESS_TOKEN;

    return await axios({
        method: 'POST',
        url: `https://graph.facebook.com/v20.0/${business.whatsappPhoneId}/messages`,
        headers: { 
            'Authorization': `Bearer ${activeToken}`,
            'Content-Type': 'application/json' 
        },
        data: {
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: type,
            ...(type === 'text' ? { text: { body: payload } } : { template: payload })
        },
        timeout: 20000 // Sekunde 20 za kusubiri ili kuepuka hang-ups
    });
};

const verifyCustomerToken = async (customerToken) => {
    const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,name&access_token=${customerToken}`, 
        { timeout: 15000 }
    );
    return response.data;
};

const downloadMetaMedia = async (mediaId, mimeType) => {
    try {
        const resUrl = await axios.get(`https://graph.facebook.com/v20.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}` }
        });
        const mediaUrl = resUrl.data.url;

        const response = await axios({
            method: 'GET',
            url: mediaUrl,
            headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}` },
            responseType: 'stream'
        });

        const extMatch = mimeType.match(/\/(.*?)(;|$)/);
        let ext = extMatch ? extMatch[1] : 'bin';
        if (ext === 'ogg') ext = 'mp3'; // Badili sauti iwe inayochezeka kirahisi
        
        const fileName = `KEDESH_${Date.now()}_${Math.floor(Math.random()*10000)}.${ext}`;
        const filePath = path.join(mediaDir, fileName);

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        return `https://apibulksms.kedeshlimited.com/media/${fileName}`; 
    } catch (error) {
        console.error(`[Media Error]: Imeshindwa kupakua faili la ID: ${mediaId}`);
        return null;
    }
};

// ============================================================================
// 🗄️ 7. MSIMAMIZI WA DATABASE (DATABASE HELPERS)
// ============================================================================
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
        console.error(`[DB Error]: Imeshindwa kuhifadhi meseji.`, dbError.message);
        return null;
    }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// ⚡ 8. SOCKET.IO EVENT HANDLERS
// ============================================================================
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
    console.log(`🔌 [SOCKET LIVE] Ofisi Kimeunganishwa: ${socket.businessId}`);
    socket.join(socket.businessId);
    
    socket.on('disconnect', () => {
        console.log(`🔴 [SOCKET OFF] Ofisi Imetoka: ${socket.businessId}`);
    });
});

// ============================================================================
// 📊 9. DASHBOARD NA RIPOTI ZA KIFEDHA
// ============================================================================
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
    } catch (error) { 
        res.status(500).json({ success: false, error: "Hitilafu wakati wa kuvuta takwimu za dashibodi." }); 
    }
});

app.get('/api/wallet/balance', verifyToken, async (req, res) => {
    try {
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId }, select: { walletBalance: true, businessName: true } });
        if (!business) return res.status(404).json({ success: false, error: "Akaunti haijapatikana." });
        res.json({ success: true, walletBalance: business.walletBalance, businessName: business.businessName });
    } catch (error) { 
        res.status(500).json({ success: false, error: "Hitilafu imetokea." }); 
    }
});

// ============================================================================
// 🔐 10. AUTHENTICATION & EMBEDDED SIGNUP FLOW
// ============================================================================
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { businessName, fullName, phone, password } = req.body;
        if (!phone || !password) return res.status(400).json({ success: false, error: "Namba na nenosiri ni lazima." });

        const exists = await prisma.business.findFirst({ where: { phone } });
        if (exists) return res.status(409).json({ success: false, error: "Namba hii imeshasajiliwa." });

        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.business.create({
            data: { businessName: businessName || 'Biashara Yangu', fullName: fullName || 'Mtumiaji', phone, password: hashedPassword, walletBalance: 0.0 }
        });
        res.status(201).json({ success: true, message: "Usajili umekamilika kikamilifu!" });
    } catch (error) { 
        res.status(500).json({ success: false, error: "Kuna hitilafu imetokea wakati wa usajili." }); 
    }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { phone, password } = req.body;
        if (!phone || !password) return res.status(400).json({ success: false, error: "Namba na nenosiri ni lazima." });

        const business = await prisma.business.findFirst({ where: { phone } });
        if (!business) return res.status(401).json({ success: false, error: "Namba hii haijasajiliwa kwenye mfumo wetu." });
        if (!business.password) return res.status(401).json({ success: false, error: "Akaunti yako iliundwa na Facebook Login, tafadhali tumia njia hiyo." });

        const isMatch = await bcrypt.compare(password, business.password);
        if (!isMatch) return res.status(401).json({ success: false, error: "Nenosiri si sahihi." });

        const token = jwt.sign({ businessId: business.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { id: business.id, businessName: business.businessName, fullName: business.fullName, phone: business.phone, walletBalance: business.walletBalance, whatsappPhoneId: business.whatsappPhoneId, wabaId: business.wabaId, isFacebookConnected: !!business.facebookId } });
    } catch (error) { 
        res.status(500).json({ success: false, error: "Hitilafu imetokea kwenye Server." }); 
    }
});

app.post('/api/auth/facebook-login', authLimiter, async (req, res) => {
    try {
        const { accessToken: codeOrToken } = req.body;
        if (!codeOrToken) return res.status(400).json({ success: false, error: "Access Token inahitajika kutoka Meta." });

        let finalToken = codeOrToken;
        if (!codeOrToken.startsWith('EAA')) {
            try {
                const tokenRes = await axios.get('https://graph.facebook.com/v20.0/oauth/access_token', {
                    params: { client_id: META_APP_ID, client_secret: META_APP_SECRET, code: codeOrToken },
                    timeout: 10000
                });
                finalToken = tokenRes.data.access_token;
            } catch (error) {
                return res.status(400).json({ success: false, error: "Mfumo umeshindwa kubadilisha code kuwa Token. Jaribu tena." });
            }
        }

        let fbUser;
        try { fbUser = await verifyCustomerToken(finalToken); } 
        catch (error) { return res.status(401).json({ success: false, error: "Imeshindwa kuthibitisha akaunti yako Meta." }); }

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
    } catch (error) { res.status(500).json({ success: false, error: "Imeshindwa kuwasiliana na mfumo wa Meta." }); }
});

app.post('/api/settings/update', verifyToken, async (req, res) => {
    try {
        const { whatsappPhoneId } = req.body;
        if (!whatsappPhoneId?.trim()) return res.status(400).json({ success: false, error: "Phone ID inahitajika." });
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        if (!business) return res.status(404).json({ success: false, error: "Akaunti haijapatikana." });
        await prisma.business.update({ where: { id: req.user.businessId }, data: { whatsappPhoneId: whatsappPhoneId.trim() } });
        res.json({ success: true, message: "Phone ID imeunganishwa kikamilifu!" });
    } catch (error) { res.status(500).json({ success: false, error: "Hitilafu imetokea." }); }
});

// ============================================================================
// 📡 11. INJINI YA KUPOKEA RIPOTI (WEBHOOK) KUTOKA META
// ============================================================================
app.get('/webhook', (req, res) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
        console.log('🟢 [WEBHOOK] Meta imeidhinisha URL yetu kikamilifu!');
        return res.status(200).send(challenge);
    }
    console.log('🔴 [WEBHOOK] Meta imekataliwa. Token ya Verify haifanani.');
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    // 🔴 KANUNI MUHIMU: Ipe Meta neno kuwa umepata taarifa fasta ili isitume tena
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

                // RIPOTI ZA SMS (DELIVERED, READ, FAILED)
                if (value.statuses?.length > 0) {
                    for (const statusObj of value.statuses) {
                        const newStatus = statusObj.status.toUpperCase();
                        let existingMsg = await prisma.message.findFirst({ where: { metaMsgId: statusObj.id } });
                        
                        if(!existingMsg) {
                            await sleep(1000); // Subiri Database ifanye Sync 
                            existingMsg = await prisma.message.findFirst({ where: { metaMsgId: statusObj.id } });
                        }

                        if(existingMsg) {
                            await prisma.message.update({ where: { id: existingMsg.id }, data: { status: newStatus } });
                            io.to(business.id).emit('messageStatusUpdate', { metaMsgId: statusObj.id, status: newStatus });
                        }
                    }
                }

                // SMS MPYA ZINAZOINGIA KUTOKA KWA WATEJA
                if (value.messages?.length > 0) {
                    for (const message of value.messages) {
                        const phoneNumber = message.from;
                        const customerName = value.contacts?.[0]?.profile?.name || phoneNumber;
                        const msgType = message.type;
                        
                        let msgBody = '';

                        if (msgType === 'text') {
                            msgBody = message.text.body;
                        } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(msgType)) {
                            const mediaObj = message[msgType];
                            if (mediaObj && mediaObj.id) {
                                const fileUrl = await downloadMetaMedia(mediaObj.id, mediaObj.mime_type);
                                if (fileUrl) {
                                    msgBody = `[MEDIA:${msgType.toUpperCase()}]${fileUrl}`;
                                } else {
                                    msgBody = `📎 [Faili: ${msgType}] - Mfumo umeshindwa kupakua.`;
                                }
                            }
                        } else {
                            msgBody = `📎 [Faili: Aina isiyojulikana (${msgType})]`;
                        }

                        const dbContact = await findOrCreateContact(business.id, phoneNumber, customerName);
                        const savedMsg = await saveMessageSafe({ 
                            metaMsgId: message.id, 
                            businessId: business.id, 
                            contactId: dbContact.id, 
                            direction: 'INBOUND', 
                            content: msgBody, 
                            status: 'RECEIVED',
                            messageType: msgType 
                        });

                        if (savedMsg) {
                            io.to(business.id).emit('newIncomingMessage', { 
                                contactId: dbContact.id, 
                                contactName: customerName, 
                                phoneNumber, 
                                message: { id: savedMsg.id, content: savedMsg.content, direction: savedMsg.direction, status: savedMsg.status, createdAt: savedMsg.createdAt } 
                            });
                        }
                    }
                }
            }
        }
    } catch (error) { 
        console.error('❌ [Webhook Fatal Error]:', error.message); 
    }
});

// ============================================================================
// 📱 12. MTAMBO WA LIVE CHAT KWA WATEJA WAKO (X-RAY INCLUDED)
// ============================================================================
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
        if (!phone || !messageText?.trim() || !contactId) return res.status(400).json({ success: false, error: "Taarifa muhimu hazijakamilika." });
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });

        if (!business.whatsappPhoneId) return res.status(403).json({ success: false, error: "Phone ID ya Meta haijaunganishwa." });
        if (business.walletBalance < LIVE_CHAT_COST) return res.status(402).json({ success: false, error: "Salio halitoshi kutuma ujumbe." });

        const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, messageText.trim(), 'text');
        const metaMsgId = metaRes.data.messages[0].id;

        const savedMsg = await saveMessageSafe({ metaMsgId, businessId: business.id, contactId, direction: 'OUTBOUND', content: messageText.trim(), status: 'SENT', messageType: 'text' });
        const updatedBiz = await prisma.business.update({ where: { id: business.id }, data: { walletBalance: { decrement: LIVE_CHAT_COST } } });

        if (savedMsg) {
            io.to(business.id).emit('newIncomingMessage', { contactId, contactName: 'You', phoneNumber: phone, message: { id: savedMsg.id, content: savedMsg.content, direction: savedMsg.direction, status: savedMsg.status, createdAt: savedMsg.createdAt } });
        }
        io.to(business.id).emit('walletUpdate', { newBalance: updatedBiz.walletBalance });

        res.json({ success: true, message: 'Ujumbe umetumwa', newBalance: updatedBiz.walletBalance });
    } catch (error) { 
        // 🔴 X-RAY SCANNER KWA MAKOSA YA META (Pia inazuia API kulipuka)
        const metaErrorDetail = error.response ? error.response.data : error.message;
        console.error("\n❌❌❌ KOSA KUTOKA META API (LIVE CHAT) ❌❌❌");
        console.error(JSON.stringify(metaErrorDetail, null, 2));
        console.error("=========================================\n");
        
        res.status(500).json({ success: false, error: "Meta imekataa ujumbe huu. Tafadhali soma PM2 Logs." }); 
    }
});

// ============================================================================
// 🚀 13. PREMIUM BULK SMS ENGINE (SMART BATCHING & ZERO RATE LIMIT)
// ============================================================================
app.post('/api/send-bulk', verifyToken, async (req, res) => {
    try {
        const { contacts, campaignName, templateName, templateLanguage, headerImageUrl } = req.body; 
        
        if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
            return res.status(400).json({ success: false, error: "Hakuna namba zilizowekwa kwenye kampeni hii!" });
        }

        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        if (!business.whatsappPhoneId) return res.status(403).json({ success: false, error: "Akaunti hii haijaunganishwa vizuri na Meta API." });
        
        const totalCost = contacts.length * BULK_SMS_COST;
        if (business.walletBalance < totalCost) {
            return res.status(402).json({ success: false, error: `Salio lako halitoshi. Unahitaji jumla ya TZS ${totalCost}.` });
        }

        // HAPA NDIPO TUNAFUNGA KAZI: Tunarudisha jibu Front-end iwe huru kusubiri kazi
        res.status(200).json({ 
            success: true, 
            message: `Kampeni imepokelewa. Mfumo unachakata SMS ${contacts.length} kwa usalama...` 
        });

        // Background Processor Inaanza hapa 
        (async () => {
            console.log(`🚀 KAMPENI MPYA INAANZA: [${campaignName}] | WATEJA: ${contacts.length}`);
            let metaSuccessCount = 0; 
            let metaFailedCount = 0; 

            // 🔴 SULUHISHO: Kupunguza idadi ili Meta wasi-block
            const CHUNK_SIZE = 10; 

            for (let i = 0; i < contacts.length; i += CHUNK_SIZE) {
                const batch = contacts.slice(i, i + CHUNK_SIZE);

                const promises = batch.map(async (phone) => {
                    try {
                        const payload = { name: templateName || "hello_world", language: { code: templateLanguage || "sw" } };
                        if (headerImageUrl?.trim()) {
                            payload.components = [{ type: "header", parameters: [{ type: "image", image: { link: headerImageUrl.trim() } }] }];
                        }
                        
                        const metaRes = await sendWhatsAppMessageAsAdmin(business, phone, payload, 'template');
                        const metaMsgId = metaRes.data.messages[0].id;
                        metaSuccessCount++;

                        const dbContact = await findOrCreateContact(business.id, phone, phone);
                        await saveMessageSafe({ 
                            metaMsgId, businessId: business.id, contactId: dbContact.id, 
                            direction: 'OUTBOUND', content: `📢 [${campaignName || 'Kampeni'}] - ${templateName}`, 
                            status: 'SENT', messageType: 'template' 
                        });
                    } catch (error) {
                        metaFailedCount++;
                        const metaErrorDetail = error.response ? error.response.data : error.message;
                        console.error(`❌ Meseji kwenda ${phone} imefeli. Sababu ya Meta:`, JSON.stringify(metaErrorDetail));
                    }
                });

                // Tunasubiri Chunk yote 10 imalize kutumwa
                await Promise.allSettled(promises);
                
                // 🔴 SULUHISHO: Kupumzisha mtambo kwa sekunde 2 kabla ya kutuma Chunk inayofuata
                // Hii ni muhimu sana kukwepa 'Rate Limit Error' kutoka Meta
                await sleep(2000); 
            }

            // Kukata pesa kulingana na meseji zilizofika tu
            const actualCost = metaSuccessCount * BULK_SMS_COST;
            let newBalance = business.walletBalance;
            if (actualCost > 0) {
                const updated = await prisma.business.update({ where: { id: business.id }, data: { walletBalance: { decrement: actualCost } } });
                newBalance = updated.walletBalance;
            }

            // Kumpa taarifa mteja kule Frontend kwamba kazi imeisha
            io.to(business.id).emit('campaignComplete', { 
                campaignName: campaignName || 'Kampeni', 
                stats: { total: contacts.length, success: metaSuccessCount, failed: metaFailedCount }, 
                newBalance 
            });

            console.log(`✅ KAMPENI [${campaignName}] IMEKAMILIKA! Zilizofika: ${metaSuccessCount}, Zilizofeli: ${metaFailedCount}`);

        })(); 

    } catch (error) { 
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: "Hitilafu isiyotarajiwa imetokea wakati wa kuanzisha kampeni." }); 
        }
    }
});

app.get('/', (req, res) => { res.json({ status: "Online 🟢", version: "5.5.0 (Premium Enterprise Level)" }); });

// ============================================================================
// 🛡️ 14. ENTERPRISE ERROR SHIELDS & GRACEFUL SHUTDOWN
// ============================================================================
app.use((req, res, next) => {
    res.status(404).json({ success: false, error: "Route unayoitafuta haipo kwenye mfumo wetu." });
});

app.use((err, req, res, next) => { 
    console.error(`🚨 [SYSTEM ERROR]: ${err.message}`);
    res.status(500).json({ success: false, error: "Kuna hitilafu kwenye mtambo. Mafundi wetu wanalishughulikia." }); 
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 [FATAL] Unhandled Rejection Imeshikwa:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('🔥 [FATAL] Uncaught Exception Imeshikwa:', error);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ MLANGO (PORT) ${PORT} UNATUMIKA NA MFUMO MWINGINE. TAFADHALI ZIMA PROCESS ILE.`);
        process.exit(1);
    }
});

// Zima Server kwa utaratibu isipoteze data za wateja
const shutdown = async () => {
    console.log('\n🛑 Inazima mtambo kwa usalama na utaratibu (Graceful Shutdown)...');
    server.close(async () => {
        await prisma.$disconnect();
        console.log('💾 Mfumo wa Database (Prisma) umefungwa salama.');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown); 
process.on('SIGINT', shutdown);  

server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(` 🚀 KEDESH SAAS BACKEND v5.5.0 (PORT 5300) IMESIMAMA IMARA `);
    console.log(` 🔐 ULINZI KWA ASILIMIA 100 UPO KAZINI (HELMET & RATE-LIMITS) `);
    console.log(` 🔍 ENGINE: X-Ray Scanner & Smart Batching Zipo Hai!`);
    console.log(`=============================================================\n`);
});