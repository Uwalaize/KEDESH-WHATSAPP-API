const axios = require('axios');

// 1. WEKA TAARIFA ZAKO HAPA CHINI
const PHONE_ID = "1141924132340569"; // Hii ni Phone ID yako niliyoitoa kwenye picha yako!
const TOKEN = "EAAMOgZBQYz1oBRuW4ch4Y7sC9HOsyYD3nsPuwVbTlF7tyO24oag1ZBv2E8t3QPbSUT7AZAgntK3ZCYkLFEb4ZAtpRjx3631LL9N2Br0xxN1bOWZAZCKdZAF4ZBTpW0A3bfacTYzUcgPMPKocppKu715xfevUWZByjNztdaEBYnJ0S7pAsYmbOSo3p6Xpmjcs7aDwZDZD"; // Futa haya maneno, paste ile Token yako ndefu ya kudumu
const PIN = "434359"; // Chagua PIN yoyote ya tarakimu 6 (Mfano: 123456) - Ikariri usiisahau.

async function registerNumber() {
    try {
        console.log("⏳ Naipiga API ya Meta kuisajili namba iwe CONNECTED...");
        
        const response = await axios.post(
            `https://graph.facebook.com/v25.0/${PHONE_ID}/register`,
            {
                messaging_product: "whatsapp",
                pin: PIN
            },
            {
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log("✅ BOOOOM! HONGERA KIONGOZI! Namba Yako Imesajiliwa Kikamilifu!");
        
    } catch (error) {
        console.error("❌ KOSA LAKO NI HILI:");
        console.error(error.response?.data?.error?.message || error.message);
    }
}

registerNumber();