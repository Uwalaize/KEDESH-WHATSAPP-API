require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
const axios = require('axios');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const { PrismaClient } = require('@prisma/client'); 

// 🚀 [MPYA] TUNAINGIZA SOCKET.IO NA HTTP SERVER 🚀
const http = require('http');
const { Server } = require('socket.io');

const app = express();
// Tunatengeneza Server ya HTTP badala ya kutumia Express pekee
const server = http.createServer(app); 

// Tunasimika Socket.io juu ya Server yetu na kuruhusu Frontend yoyote iunganishwe
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

const { META_VERIFY_TOKEN, META_ACCESS_TOKEN } = process.env;
const JWT_SECRET = process.env.JWT_SECRET || "KEDESH_LIMITED_PREMIUM_SECRET_2026"; 

if (!META_VERIFY_TOKEN || !META_ACCESS_TOKEN) {
    console.error("🚨 [KOSA KUBWA] Funguo za Meta (Token) hazijakamilika kwenye .env");
    process.exit(1); 
}

app.use(helmet()); 
app.use(cors()); 
app.use(express.json({ limit: '5mb' })); 

const apiLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 150, standardHeaders: true, legacyHeaders: false });
app.use('/api/', apiLimiter); 

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, error: "Akaunti imefungiwa kwa muda." } });

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ success: false, error: "Huruhusiwi, Tiketi inahitajika." });
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ success: false, error: "Tiketi imekwisha muda wake. Ingia upya." });
        req.user = decoded; 
        next();
    });
};

// ========================================================
// ⚡ 2. MTAMBO WA SOCKET.IO (REAL-TIME ENGINE) ⚡
// ========================================================
io.use((socket, next) => {
    // ULINZI MKALI: Tunakagua Tiketi (JWT) mteja anapojaribu kuunganishwa Live
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error("Huruhusiwi. Hakuna Tiketi."));

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Tiketi imekwisha muda."));
        socket.businessId = decoded.businessId; // Hifadhi ID ya Ofisi kuzuia kuingiliana
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`🔌 [SOCKET LIVE] Ofisi ID: ${socket.businessId} imeunganishwa papo hapo.`);
    
    // Tunamuweka mteja kwenye 'Chumba' chake maalumu kiusalama (SaaS Multi-tenant isolation)
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

        res.status(200).json({ success: true, stats: { totalContacts, totalSent, totalDelivered, totalFailed } });
    } catch (error) { res.status(500).json({ success: false, error: "Imeshindwa kuvuta takwimu." }); }
});

// ==========================================
// 🔐 4. API ZA AUTHENTICATION (REGISTER & LOGIN)
// ==========================================
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { businessName, fullName, phone, password } = req.body;
        const existingBusiness = await prisma.business.findUnique({ where: { phone } });
        if (existingBusiness) return res.status(400).json({ success: false, error: "Namba hii tayari imeshasajiliwa." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await prisma.business.create({
            data: { businessName, fullName, phone, password: hashedPassword, walletBalance: 0.0 }
        });

        console.log(`\n🎊 [MTEJA MPYA SAAS] -> Jina: ${businessName} | Namba: +${phone}`);
        res.status(201).json({ success: true, message: "Usajili umekamilika kikamilifu!" });
    } catch (error) { res.status(500).json({ success: false, error: "Hitilafu kwenye Server." }); }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { phone, password } = req.body;
        const business = await prisma.business.findUnique({ where: { phone } });
        if (!business || !(await bcrypt.compare(password, business.password))) return res.status(401).json({ success: false, error: "Taarifa sio sahihi." });

        const token = jwt.sign({ businessId: business.id, phone: business.phone }, JWT_SECRET, { expiresIn: '7d' });
        console.log(`🔓 [LOGIN SUCCESS] -> ${business.businessName} ameingia kwenye mfumo.`);
        res.status(200).json({ success: true, token, user: { id: business.id, businessName: business.businessName, fullName: business.fullName, phone: business.phone, walletBalance: business.walletBalance, whatsappPhoneId: business.whatsappPhoneId } });
    } catch (error) { res.status(500).json({ success: false, error: "Hitilafu kwenye Server." }); }
});

// ==========================================
// ⚙️ 5. MIPANGILIO YA PHONE ID (LOCK SECURITY)
// ==========================================
app.post('/api/settings/update', verifyToken, async (req, res) => {
    try {
        const { whatsappPhoneId } = req.body;
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        
        if(business.whatsappPhoneId && business.whatsappPhoneId !== whatsappPhoneId.trim()) {
            console.log(`\n🔒 [ULINZI] ${business.businessName} amejaribu kubadili Phone ID kwa nguvu. (ZUIO)`);
            return res.status(400).json({ success: false, error: "Namba hii tayari imesajiliwa na imefungwa. Wasiliana na Admin kuibadili." });
        }

        await prisma.business.update({ where: { id: req.user.businessId }, data: { whatsappPhoneId: whatsappPhoneId.trim() } });
        console.log(`\n🔒 [PHONE ID ILIYOFUNGWA] ${business.businessName} -> Namba MPYA: ${whatsappPhoneId.trim()}`);
        res.status(200).json({ success: true, message: "Namba ya Phone ID imeunganishwa kikamilifu!" });
    } catch (error) { res.status(500).json({ success: false, error: "Hitilafu imetokea." }); }
});

// ==========================================
// 📡 6. KUTHIBITISHA & KUPOKEA WEBHOOK (META)
// ==========================================
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode']; const token = req.query['hub.verify_token']; const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
        console.log(`\n🟢 [WEBHOOK] Imeunganishwa na Meta Kikamilifu!`);
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    res.sendStatus(200); // 🚨 Lazima Turudishe OK 200 Haraka Kuzuia Meta Timeout
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
                    
                    if (!business) continue; // Kama ofisi haipo kwenye Database, ipuuze kimya kimya

                    // 🔥 A) KUKAMATA TIKI ZA WHATSAPP (READ RECEIPTS) NA KUSUKUMA HEWANI
                    if (value.statuses && value.statuses.length > 0) {
                        for (const statusObj of value.statuses) {
                            const newStatus = statusObj.status.toUpperCase(); 
                            await prisma.message.updateMany({ where: { metaMsgId: statusObj.id }, data: { status: newStatus } });
                            
                            // 🚀 [SOCKET EMIT] Sukuma Tiki Mpya iende Live kwenye kioo cha mteja husika!
                            io.to(business.id).emit('messageStatusUpdate', {
                                metaMsgId: statusObj.id,
                                status: newStatus
                            });

                            let tickIcon = newStatus === 'READ' ? '🔵 (Soma)' : newStatus === 'DELIVERED' ? '🔘 (Fika)' : newStatus === 'SENT' ? '⚪ (Tuma)' : '❌ (Feli)';
                            if(newStatus !== 'SENT') {
                                console.log(`   ${tickIcon} [TIKI LIVE] -> ${business.businessName}`);
                            }
                        }
                    }

                    // 🔥 B) KUKAMATA MESEJI MPYA INAYOINGIA (INBOUND) NA KUISUKUMA HEWANI
                    if (value.messages && value.messages.length > 0) {
                        for (const message of value.messages) {
                            const phoneNumber = message.from;
                            const customerName = value.contacts?.[0]?.profile?.name || phoneNumber;
                            
                            let msgBody = "";
                            if (message.type === 'text') msgBody = message.text.body;
                            else if (message.type === 'button') msgBody = message.button?.text || "[Amebofya Kitufe]";
                            else if (message.type === 'interactive') msgBody = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "[Mwitikio]";
                            else msgBody = `📎 [Faili/Interactive: ${message.type}]`;

                            let dbContact = await prisma.contact.findFirst({ where: { businessId: business.id, phoneNumber: phoneNumber } });
                            if (!dbContact) dbContact = await prisma.contact.create({ data: { businessId: business.id, phoneNumber: phoneNumber, name: customerName } });

                            const existingMsg = await prisma.message.findFirst({ where: { metaMsgId: message.id } });
                            if (!existingMsg) {
                                // Save kwa Database kwanza
                                const newMsg = await prisma.message.create({
                                    data: { businessId: business.id, contactId: dbContact.id, metaMsgId: message.id, direction: 'INBOUND', content: msgBody, status: 'RECEIVED' }
                                });

                                console.log(`\n┌───────────────────────────────────────────────────────┐`);
                                console.log(`│ 📥 [INBOX MPYA] KUTOKA: ${customerName} (+${phoneNumber})`);
                                console.log(`│ 🏢 KWENDA KWA: ${business.businessName}`);
                                console.log(`│ 💬 UJUMBE: "${msgBody}"`);
                                console.log(`└───────────────────────────────────────────────────────┘\n`);

                                // 🚀 [SOCKET EMIT] Sukuma Meseji Mpya kwenda kwenye kioo cha mteja LIVE papo hapo!
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
    } catch (error) { console.error("❌ Kosa la Webhook:", error.message); }
});

// ==========================================
// 📱 7. API ZA FRONTEND LIVE CHAT 
// ==========================================
app.get('/api/chat/contacts', verifyToken, async (req, res) => {
    try {
        const contacts = await prisma.contact.findMany({ where: { businessId: req.user.businessId }, include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } } });
        const formattedContacts = await Promise.all(contacts.filter(c => c.messages.length > 0).map(async c => {
            const unreadCount = await prisma.message.count({ where: { contactId: c.id, direction: 'INBOUND', status: 'RECEIVED' } });
            return {
                id: c.id, name: c.name || c.phoneNumber, phone: c.phoneNumber, lastMsg: c.messages[0]?.content || "...", time: c.messages[0]?.createdAt, unread: unreadCount, lastSender: c.messages[0]?.direction === 'OUTBOUND' ? 'me' : 'them', lastStatus: c.messages[0]?.status
            };
        }));
        formattedContacts.sort((a, b) => new Date(b.time) - new Date(a.time));
        res.status(200).json({ success: true, contacts: formattedContacts });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/chat/messages/:contactId', verifyToken, async (req, res) => {
    try {
        await prisma.message.updateMany({ where: { contactId: req.params.contactId, businessId: req.user.businessId, direction: 'INBOUND', status: 'RECEIVED' }, data: { status: 'READ' } });
        const messages = await prisma.message.findMany({ where: { contactId: req.params.contactId, businessId: req.user.businessId }, orderBy: { createdAt: 'asc' } });
        res.status(200).json({ success: true, messages: messages.map(m => ({ id: m.id, content: m.content, direction: m.direction, status: m.status, createdAt: m.createdAt })) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 🔥 LIVE CHAT SEND: INAKATA TZS 30 NA INALINDA MASAA 24 🔥
app.post('/api/chat/send', verifyToken, async (req, res) => {
    try {
        const { contactId, phone, messageText } = req.body;
        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });

        const phoneIdToUse = business.whatsappPhoneId;
        if (!phoneIdToUse) return res.status(403).json({ success: false, error: "Hujaunganishwa Phone ID yako. Tafadhali iweke kwenye mipangilio kwanza." });
        
        if (business.walletBalance < LIVE_CHAT_COST) {
            return res.status(402).json({ success: false, error: `Salio lako halitoshi. Unahitaji TZS ${LIVE_CHAT_COST} kujibu.` });
        }

        const metaRes = await axios({
            method: 'POST', url: `https://graph.facebook.com/v25.0/${phoneIdToUse}/messages`,
            headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
            data: { messaging_product: "whatsapp", to: phone, type: "text", text: { body: messageText } }
        });

        const updatedBiz = await prisma.$transaction([
            prisma.message.create({ data: { businessId: business.id, contactId, metaMsgId: metaRes.data.messages[0].id, direction: 'OUTBOUND', content: messageText, status: 'SENT' } }),
            prisma.business.update({ where: { id: business.id }, data: { walletBalance: { decrement: LIVE_CHAT_COST } } })
        ]);

        console.log(`\n💬 [LIVE CHAT] ${business.businessName} amemjibu mteja.`);
        console.log(`💸 [FAIDA SAFI] Umekata TZS ${LIVE_CHAT_COST} | Salio Baki: TZS ${updatedBiz[1].walletBalance}\n`);
        
        // Kama mteja kafungua PC mbili, Meseji uliyotuma ionekane kote!
        io.to(business.id).emit('newIncomingMessage', {
             contactId: contactId,
             contactName: "You",
             phoneNumber: phone,
             message: {
                 id: updatedBiz[0].id,
                 content: updatedBiz[0].content,
                 direction: updatedBiz[0].direction,
                 status: updatedBiz[0].status,
                 createdAt: updatedBiz[0].createdAt
             }
        });

        res.status(200).json({ success: true, message: "Imetumwa", newBalance: updatedBiz[1].walletBalance, newMsg: updatedBiz[0] });
    } catch (error) { 
        const errorMsg = error.response?.data?.error?.message || "";
        const errorCode = error.response?.data?.error?.code;

        if(errorMsg.includes('24 hour') || errorMsg.includes('outside the allowed') || errorCode === 131047) {
            return res.status(400).json({ success: false, error: "Masaa 24 yameisha tangu mteja huyu atume meseji. Kisheria, huwezi kutuma ujumbe wa kawaida hapa. Tafadhali nenda 'Kituo cha Bulk SMS' kuanzisha mazungumzo upya kwa kutumia Template." });
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
        if (!contacts || contacts.length === 0) return res.status(400).json({ success: false, error: "Namba hazipo." });

        const business = await prisma.business.findUnique({ where: { id: req.user.businessId } });
        
        const phoneIdToUse = business.whatsappPhoneId;
        if (!phoneIdToUse) return res.status(403).json({ success: false, error: "Akaunti yako haijaunganishwa Phone ID." });
        
        const totalEstimatedCost = contacts.length * BULK_SMS_COST;
        if (business.walletBalance < totalEstimatedCost) return res.status(402).json({ success: false, error: `Salio halitoshi. Unahitaji TZS ${totalEstimatedCost}.` });

        console.log(`\n┏━━━━━━━━━━━━━━━━ 🚀 KAMPENI MPYA INAANZA ━━━━━━━━━━━━━━━━┓`);
        console.log(`┃ BIASHARA : ${business.businessName}`);
        console.log(`┃ WATEJA   : ${contacts.length}`);
        console.log(`┃ TEMPLATE : ${templateName} (${templateLanguage})`);
        console.log(`┃ GHARAMA  : Inakadiria kukata TZS ${totalEstimatedCost}`);
        console.log(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`);
        
        let successCount = 0; let failedCount = 0; let failedNumbers = []; 

        for (let phone of contacts) {
            try {
                let templatePayload = { name: templateName || "hello_world", language: { code: templateLanguage || "sw" } };

                if (headerImageUrl && headerImageUrl.trim() !== '') {
                    templatePayload.components = [{ type: "header", parameters: [{ type: "image", image: { link: headerImageUrl.trim() } }] }];
                }

                const metaRes = await axios({
                    method: 'POST', url: `https://graph.facebook.com/v25.0/${phoneIdToUse}/messages`,
                    headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                    data: { messaging_product: "whatsapp", to: phone, type: "template", template: templatePayload }
                });
                
                successCount++;
                process.stdout.write(`✅ `);
                const metaMsgId = metaRes.data.messages[0].id;

                let dbContact = await prisma.contact.findFirst({ where: { businessId: business.id, phoneNumber: phone } });
                if (!dbContact) dbContact = await prisma.contact.create({ data: { businessId: business.id, phoneNumber: phone, name: phone } });

                await prisma.message.create({
                    data: { businessId: business.id, contactId: dbContact.id, metaMsgId: metaMsgId, direction: 'OUTBOUND', content: `📢 [Kampeni: ${campaignName || 'Ofa'} - Tmp: ${templateName}]`, status: 'SENT' }
                });

                await new Promise(resolve => setTimeout(resolve, 300)); 
            } catch (error) {
                failedCount++;
                const metaError = error.response?.data?.error?.message || error.message;
                process.stdout.write(`❌ `);
                failedNumbers.push({ phone, reason: metaError });
            }
        }

        const actualCost = successCount * BULK_SMS_COST;
        let newBalance = business.walletBalance;
        
        if (actualCost > 0) {
            const updatedBiz = await prisma.business.update({ where: { id: business.id }, data: { walletBalance: { decrement: actualCost } } });
            newBalance = updatedBiz.walletBalance;
        }

        console.log(`\n\n╔════════════════ 🏁 KAMPENI IMEKAMILIKA ════════════════╗`);
        console.log(`║ ✅ YAMEFIKA: ${successCount}`);
        console.log(`║ ❌ YAMEFELI: ${failedCount}`);
        console.log(`║ 💸 MAKATO  : TZS ${actualCost}`);
        console.log(`║ 🏦 SALIO   : TZS ${newBalance}`);
        console.log(`╚════════════════════════════════════════════════════════╝\n`);

        return res.status(200).json({ success: true, message: "Kampeni Imekamilika", stats: { total: contacts.length, success: successCount, failed: failedCount }, newBalance });
    } catch (error) { return res.status(500).json({ success: false, error: "Hitilafu imetokea kwenye Server." }); }
});

app.get('/', (req, res) => { res.status(200).json({ status: "Online 🟢", sockets: "Active 🔌" }); });

// 🔥🔥 MUHIMU: TUNA TUMIA `server.listen` BADALA YA `app.listen` ILI SOCKET IFANYE KAZI 🔥🔥
server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(` 🚀 KEDESH SAAS BACKEND IMESIMAMA IMARA NA INASUBIRI KAZI `);
    console.log(`=============================================================`);
    console.log(` 🟢 PORT       : ${PORT}`);
    console.log(` 🏢 MUUNDO     : Multi-Tenant SaaS (DB Phone IDs)`);
    console.log(` ⚡ SOCKET.IO  : Ipo Hewani, Inasukuma SMS & Tiki LIVE!`);
    console.log(` 💰 BULK SMS   : TZS ${BULK_SMS_COST} kwa Ujumbe`);
    console.log(` 💬 LIVE CHAT  : TZS ${LIVE_CHAT_COST} kwa Ujumbe`);
    console.log(`=============================================================\n`);
});