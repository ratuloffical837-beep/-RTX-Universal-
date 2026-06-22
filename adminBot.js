const { Telegraf, Markup } = require('telegraf');
const db = require('./firebaseConfig.js');
const bot = new Telegraf(process.env.ADMIN_BOT_TOKEN);

const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);
let activeSessions = {};

bot.use((ctx, next) => {
    if (!ctx.from || ctx.from.id !== ADMIN_ID) {
        return ctx.reply("❌ আপনি এই সিস্টেমের অনুমোদিত অ্যাডমিন নন!");
    }
    return next();
});

const adminKeyboard = Markup.keyboard([
    ['👤 ফেসবুক আইডি যোগ করুন', '📝 নতুন কমেন্ট যোগ করুন'],
    ['🗑️ পুরাতন কমেন্ট ডিলেট করুন', '📊 আইডির স্ট্যাটাস চেক করুন'],
    ['🔴 লগআউট আইডির তালিকা']
]).resize();

bot.start((ctx) => ctx.reply('⚙️ RTX SMM সিকিউরড অ্যাডমিন ড্যাশবোর্ড অ্যাক্টিভেটেড।', adminKeyboard));

bot.hears('👤 ফেসবুক আইডি যোগ করুন', async (ctx) => {
    const msg = await ctx.reply('👤 আইডি যোগ করার জন্য নিচের ফরম্যাটে তথ্য পাঠান:\n\n`নম্বর:নাম:কুকিজ`\n\nযেমন: `019XXXXXXXX:ajoy khan:datr=xxxx;c_user=xxxx;`');
    activeSessions[ctx.from.id] = { state: 'AWAITING_COOKIE', infoMsgId: msg.message_id };
});

bot.hears('📝 নতুন কমেন্ট যোগ করুন', async (ctx) => {
    const msg = await ctx.reply('📝 কমেন্ট ব্যাংকে ডেটা পুশ করার জন্য প্রতি লাইনে একটি করে কমেন্ট লিখে একসাথে পাঠান।');
    activeSessions[ctx.from.id] = { state: 'AWAITING_COMMENTS', infoMsgId: msg.message_id };
});

bot.hears('🗑️ পুরাতন কমেন্ট ডিলেট করুন', async (ctx) => {
    try {
        const snapshot = await db.collection('comment_bank').get();
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        ctx.reply('🗑️ সফলভাবে আগের সব পুরাতন কমেন্ট ডাটাবেজ থেকে মুছে ফেলা হয়েছে!');
    } catch (e) {
        ctx.reply('❌ কমেন্ট মুছতে ত্রুটি ঘটেছে!');
    }
});

bot.hears('📊 আইডির স্ট্যাটাস চেক করুন', async (ctx) => {
    try {
        const snapshot = await db.collection('fb_accounts').get();
        let active = 0, dead = 0, pending = 0, checkpoint = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'Active') active++;
            else if (data.status === 'Dead') dead++;
            else if (data.status === 'Checkpoint') checkpoint++;
            else pending++;
        });
        ctx.reply(`📊 **লাইভ অ্যাকাউন্ট রিপোর্ট:**\n\n🟢 একটিভ আইডি: ${active} টি\n🟡 চেকপয়েন্ট আইডি: ${checkpoint} টি\n🔴 লগআউট আইডি: ${dead} টি\n⏳ ভেরিফাইং কিউ: ${pending} টি`);
    } catch (e) {
        ctx.reply('❌ ডাটাবেজ ত্রুটি!');
    }
});

bot.hears('🔴 লগআউট আইডির তালিকা', async (ctx) => {
    try {
        const snapshot = await db.collection('fb_accounts').where('status', 'in', ['Dead', 'Checkpoint']).get();
        if (snapshot.empty) return ctx.reply('🟢 বর্তমানে কোনো লগআউট/লকড আইডি নেই। সব আইডি ঠিক আছে!');
        
        let list = `🔴 **সমস্যাযুক্ত আইডির তালিকা:**\n\n`;
        let i = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            list += `${i++}. নাম: ${data.name} | ফোন: ${data.phone} [${data.status}]\n`;
        });
        ctx.reply(list);
    } catch (e) {
        ctx.reply('❌ তালিকা আনতে ব্যর্থ!');
    }
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    const userId = ctx.from.id;
    const session = activeSessions[userId];

    if (!session) return;

    if (session.state === 'AWAITING_COOKIE') {
        const parts = text.split(':');
        if (parts.length < 3) return ctx.reply('❌ ভুল ফরম্যাট! দয়া করে নম্বর:নাম:কুকিজ এভাবে দিন।');

        const phone = parts[0].trim();
        const name = parts[1].trim();
        const cookieRaw = parts.slice(2).join(':').trim();

        const cookieArray = cookieRaw.split(';').map(pair => {
            const cleanPair = pair.trim();
            if (!cleanPair) return null; // অতিরিক্ত ডাবল সেমিকোলন (;;) ট্র্যাপ হ্যান্ডলিং

            const index = cleanPair.indexOf('=');
            if (index === -1) return null;
            
            const key = cleanPair.substring(0, index).trim();
            const value = cleanPair.substring(index + 1).trim();
            if (!key) return null;
            
            return { 
                name: key, 
                value: value, 
                domain: '.facebook.com', 
                path: '/',
                secure: true,
                sameSite: 'None'
            };
        }).filter(c => c !== null);

        if (cookieArray.length === 0) return ctx.reply('❌ কুকিজ ফিল্টার করা যায়নি! সঠিক কুকি দিন।');

        await db.collection('fb_accounts').doc(phone).set({
            phone,
            name,
            cookies: JSON.stringify(cookieArray),
            status: 'PendingLogin',
            updatedAt: new Date()
        });

        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            await ctx.telegram.deleteMessage(ctx.chat.id, session.infoMsgId);
        } catch (e) {}

        delete activeSessions[userId];
        return ctx.reply(`⏳ ${name} (${phone}) ভেরিফিকেশন কিউতে যুক্ত। ব্যাকএন্ড চেক করছে...`);
    }

    if (session.state === 'AWAITING_COMMENTS') {
        const comments = text.split('\n').map(c => c.trim()).filter(c => c.length > 0);
        if (comments.length === 0) return ctx.reply('❌ কোনো বৈধ কমেন্ট পাওয়া যায়নি।');

        try {
            const batch = db.batch();
            comments.forEach(comment => {
                const docRef = db.collection('comment_bank').doc();
                batch.set(docRef, { text: comment, createdAt: new Date() });
            });
            await batch.commit();
            
            delete activeSessions[userId];
            return ctx.reply(`✅ সফলভাবে নতুন ${comments.length} টি কমেন্ট ডাটাবেজে যোগ হয়েছে।`);
        } catch (err) {
            return ctx.reply(`❌ ভুল: ${err.message}`);
        }
    }
});

bot.launch().catch(err => console.error('Admin Bot Error:', err));
