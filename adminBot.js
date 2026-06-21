const { Telegraf, Markup } = require('telegraf');
const db = require('./firebaseConfig.js');
const bot = new Telegraf(process.env.ADMIN_BOT_TOKEN);

const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);

bot.use((ctx, next) => {
    if (!ctx.from || ctx.from.id !== ADMIN_ID) {
        return ctx.reply("❌ আপনি এই সিস্টেমের অনুমোদিত অ্যাডমিন নন!");
    }
    return next();
});

let activeSessions = {};

const adminKeyboard = Markup.keyboard([
    ['➕ ফেসবুক আইডি যোগ করুন', '📝 কমেন্ট যোগ করুন'],
    ['📊 আইডি স্ট্যাটাস চেক করুন']
]).resize();

bot.start((ctx) => ctx.reply('⚙️ RTX SMM সিকিউরড অ্যাডমিন ড্যাশবোর্ড অ্যাক্টিভেটেড।', adminKeyboard));

bot.hears('➕ ফেসবুক আইডি যোগ করুন', (ctx) => {
    ctx.reply('👤 ফেসবুক আইডি এবং পাসওয়ার্ড এই ফরম্যাটে পাঠান:\n\n`নম্বর:পাসওয়ার্ড`\n\nযেমন: 01344594289:Ratscdn727jej');
});

bot.hears('📝 কমেন্ট যোগ করুন', (ctx) => {
    ctx.reply('📝 কমেন্ট ব্যাংকে ডেটা পুশ করার জন্য প্রতি লাইনে একটি করে কমেন্ট লিখে একসাথে পাঠান।');
});

bot.hears('📊 আইডি স্ট্যাটাস চেক করুন', async (ctx) => {
    try {
        const snapshot = await db.collection('fb_accounts').get();
        let active = 0, dead = 0, pending = 0;
        let deadList = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'Active') active++;
            else if (data.status === 'Dead') { dead++; deadList.push(data.phone); }
            else pending++;
        });

        let response = `📊 **📊 লাইভ অ্যাকাউন্ট রিপোর্ট:**\n\n🟢 একটিভ: ${active} টি\n🟡 ওটিপি পেন্ডিং/ওয়েটিং: ${pending} টি\n🔴 বন্ধ/লগআউট: ${dead} টি\n`;
        if (deadList.length > 0) {
            response += `\n**🔴 ডেড আইডির তালিকা:**\n${deadList.map((p, i) => `${i+1}. ${p}`).join('\n')}`;
        }
        ctx.reply(response);
    } catch (e) {
        ctx.reply('❌ ডাটাবেজ ত্রুটি!');
    }
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    const userId = ctx.from.id;

    if (activeSessions[userId] && activeSessions[userId].state === 'AWAITING_OTP') {
        const phone = activeSessions[userId].phone;
        await db.collection('fb_accounts').doc(phone).update({
            otpCode: text,
            status: 'SubmittingOTP'
        });
        delete activeSessions[userId];
        return ctx.reply(`⚡ ওটিপি কোড (${text}) ব্রাউজারে ফরওয়ার্ড করা হয়েছে।`);
    }

    if (text.includes(':')) {
        const parts = text.split(':');
        const phone = parts[0].trim();
        const password = parts.slice(1).join(':').trim();

        if (phone.length < 10 || !password) {
            return ctx.reply('❌ ভুল ফরম্যাট! দয়া করে নম্বর:পাসওয়ার্ড এভাবে পাঠান।');
        }

        await db.collection('fb_accounts').doc(phone).set({
            phone,
            password,
            status: 'PendingLogin',
            cookies: '',
            otpCode: '',
            updatedAt: new Date()
        });

        activeSessions[userId] = { phone: phone, state: 'AWAITING_OTP' };
        return ctx.reply(`⏳ ${phone} লগইন কিউতে যুক্ত। ওটিপি পেজ ডিটেক্ট হলে নোটিফিকেশন পাঠানো হবে।`);
    }

    if (!text.includes('➕') && !text.includes('📊') && !text.includes('📝')) {
        if (text.length <= 6 && !isNaN(text)) {
            return ctx.reply('⚠️ এই মুহূর্তে কোনো ফেসবুক অ্যাকাউন্ট ওটিপির জন্য অপেক্ষা করছে না। কোডটি বাতিল করা হয়েছে।');
        }

        const comments = text.split('\n').map(c => c.trim()).filter(c => c.length > 0);
        if (comments.length === 0) return;

        ctx.reply(`⏳ ${comments.length} টি কমেন্ট সেভ করা হচ্ছে...`);

        try {
            const chunkSize = 450; 
            for (let i = 0; i < comments.length; i += chunkSize) {
                const chunk = comments.slice(i, i + chunkSize);
                const batch = db.batch();

                chunk.forEach(comment => {
                    const docRef = db.collection('comment_bank').doc();
                    batch.set(docRef, { text: comment, createdAt: new Date() });
                });

                await batch.commit();
            }
            return ctx.reply(`✅ সফলভাবে সবকটি (${comments.length} টি) কমেন্ট ডাটাবেজে যুক্ত হয়েছে।`);
        } catch (err) {
            return ctx.reply(`❌ কমেন্ট সেভ করতে ত্রুটি ঘটেছে: ${err.message}`);
        }
    }
});

bot.launch().catch(err => console.error('Admin Bot Fatal Error:', err));
