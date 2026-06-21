const { Telegraf, Markup } = require('telegraf');
const db = require('./firebaseConfig.js');
const bot = new Telegraf(process.env.ADMIN_BOT_TOKEN);

const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);

// শুধুমাত্র নির্ধারিত অ্যাডমিনের জন্য অ্যাক্সেস ভেরিফিকেশন
bot.use((ctx, next) => {
    if (!ctx.from || ctx.from.id !== ADMIN_ID) {
        return ctx.reply("❌ আপনি এই সিস্টেমের অনুমোদিত অ্যাডমিন নন!");
    }
    return next();
});

// সুরক্ষিত স্টেট ট্র্যাকার (মেমোরি ওভারল্যাপ মুক্ত)
let activeSessions = {};

const adminKeyboard = Markup.keyboard([
    ['➕ ফেসবুক আইডি যোগ করুন', '📝 কমেন্ট যোগ করুন'],
    ['📊 আইডি স্ট্যাটাস চেক করুন']
]).resize();

bot.start((ctx) => ctx.reply('⚙️ RTX SMM সিকিউরড অ্যাডমিন ড্যাশবোর্ড অ্যাক্টিভেটেড।', adminKeyboard));

bot.hears('➕ ফেসবুক আইডি যোগ করুন', (ctx) => {
    const userId = ctx.from.id;
    activeSessions[userId] = { state: 'AWAITING_ID_PASS' };
    ctx.reply('👤 ফেসবুক আইডি এবং পাসওয়ার্ড এই ফরম্যাটে পাঠান:\n\n`নম্বর:পাসওয়ার্ড`\n\nযেমন: 01344594289:Ratscdn727jej');
});

bot.hears('📝 কমেন্ট যোগ করুন', (ctx) => {
    const userId = ctx.from.id;
    activeSessions[userId] = { state: 'AWAITING_COMMENTS' };
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

        let response = `📊 **লাইভ অ্যাকাউন্ট রিপোর্ট:**\n\n🟢 একটিভ: ${active} টি\n🟡 ওটিপি পেন্ডিং/ওয়েटिंग: ${pending} টি\n🔴 বন্ধ/লগআউট: ${dead} টি\n`;
        if (deadList.length > 0) {
            response += `\n**🔴 ডেড আইডির তালিকা:**\n${deadList.map((p, i) => `${i+1}. ${p}`).join('\n')}`;
        }
        ctx.reply(response);
    } catch (e) {
        ctx.reply('❌ ডাটাবেজ ত্রুটি!');
    }
});

// সেন্ট্রালাইজড টেক্সট প্রসেসর
bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    const userId = ctx.from.id;
    const currentSession = activeSessions[userId];

    // ১. ওটিপি সাবমিশন চেক (যদি আইডি WaitingOTP স্টেটে থাকে)
    if (currentSession && currentSession.state === 'AWAITING_OTP') {
        const phone = currentSession.phone;
        await db.collection('fb_accounts').doc(phone).update({
            otpCode: text,
            status: 'SubmittingOTP'
        });
        delete activeSessions[userId]; // ওটিপি নেওয়ার পর সেশন একদম ক্লিয়ার
        return ctx.reply(`⚡ ওটিপি কোড (${text}) ব্রাউজারে ফরওয়ার্ড করা হয়েছে।`);
    }

    // ২. আইডি এবং পাসওয়ার্ড ইনপুট প্রসেস
    if (currentSession && currentSession.state === 'AWAITING_ID_PASS') {
        if (!text.includes(':')) {
            return ctx.reply('❌ ভুল ফরম্যাট! দয়া করে নম্বর:পাসওয়ার্ড এভাবে পাঠান।');
        }
        const parts = text.split(':');
        const phone = parts[0].trim();
        const password = parts.slice(1).join(':').trim();

        if (phone.length < 10 || !password) {
            return ctx.reply('❌ ভুল নম্বর বা পাসওয়ার্ড। আবার চেষ্টা করুন।');
        }

        await db.collection('fb_accounts').doc(phone).set({
            phone,
            password,
            status: 'PendingLogin',
            cookies: '',
            otpCode: '',
            updatedAt: new Date()
        });

        // ওটিপি ক্যাচ করার জন্য সেশন স্টেট পরিবর্তন
        activeSessions[userId] = { phone: phone, state: 'AWAITING_OTP' };
        return ctx.reply(`⏳ ${phone} লগইন কিউতে যুক্ত। ব্রাউজার রান হচ্ছে, ওটিপি পেজ ডিটেক্ট হলে এখানে কোড চাইবে।`);
    }

    // ৩. কমেন্ট ব্যাংক প্রসেস
    if (currentSession && currentSession.state === 'AWAITING_COMMENTS') {
        const comments = text.split('\n').map(c => c.trim()).filter(c => c.length > 0);
        if (comments.length === 0) {
            return ctx.reply('❌ কোনো বৈধ কমেন্ট পাওয়া যায়নি।');
        }

        ctx.reply(`⏳ ${comments.length} টি কমেন্ট সেভ করা হচ্ছে...`);
        try {
            const batch = db.batch();
            comments.forEach(comment => {
                const docRef = db.collection('comment_bank').doc();
                batch.set(docRef, { text: comment, createdAt: new Date() });
            });
            await batch.commit();
            delete activeSessions[userId]; // সেশন মুক্ত
            return ctx.reply(`✅ সফলভাবে সবকটি (${comments.length} টি) কমেন্ট ব্যাংকে যুক্ত হয়েছে।`);
        } catch (err) {
            return ctx.reply(`❌ কমেন্ট সেভ করতে ত্রুটি: ${err.message}`);
        }
    }

    // কোনো অ্যাক্টিভ সেশন ছাড়া র্যান্ডম টেক্সট পাঠালে ডিফল্ট অ্যালার্ট
    return ctx.reply('⚠️ অনুগ্রহ করে নিচের বাটন ব্যবহার করে কমান্ড সিলেক্ট করুন।');
});

bot.launch().catch(err => console.error('Admin Bot Fatal Error:', err));
