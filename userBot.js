const { Telegraf, Markup } = require('telegraf');
const db = require('./firebaseConfig.js');
const bot = new Telegraf(process.env.USER_BOT_TOKEN);
const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);

const startupTime = new Date(); // ব্যাকএন্ড রান হওয়ার কারেন্ট টাইমস্ট্যাম্প ট্র্যাকিং

bot.start(async (ctx) => {
    const userId = ctx.from.id.toString();
    const username = ctx.from.first_name || "User";

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        await userRef.set({ balance: 0.00, username: username, createdAt: new Date() });
    }

    ctx.reply('👋 RTX SMM প্যানেলে স্বাগতম! লাইক ও কমেন্ট সার্ভিস নিতে নিচের বাটন থেকে মিনি অ্যাপ ওপেন করুন।', 
    Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 ওপেন মিনি অ্যাপ', `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:3000'}`)]
    ]));
});

// শুধুমাত্র ব্যাকএন্ড বুট হওয়ার পরের নতুন ডেটার উপর লিসেনার সচল করা হলো
db.collection('deposits')
  .where('status', '==', 'pending')
  .where('createdAt', '>=', startupTime)
  .onSnapshot((snapshot) => {
    if (!snapshot) return;
    snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
            const depData = change.doc.data();
            const depId = change.doc.id;

            try {
                await bot.telegram.sendMessage(ADMIN_ID, 
                    `💰 **নতুন ডিপোজিট রিকোয়েস্ট!**\n\n👤 ইউজার: ${depData.username} (ID: ${depData.userId})\n📞 ফোন: ${depData.userPhone}\n💵 পরিমাণ: ${depData.amount} BDT\n🔑 TxID: ${depData.txid}`,
                    Markup.inlineKeyboard([
                        [
                            Markup.button.callback('✅ Confirm', `approve_${depId}`),
                            Markup.button.callback('❌ Reject', `reject_${depId}`)
                        ]
                    ])
                );
            } catch (e) { console.error(e.message); }
        }
    });
});

bot.action(/approve_(.+)/, async (ctx) => {
    const depId = ctx.match[1];
    try {
        await db.runTransaction(async (transaction) => {
            const depRef = db.collection('deposits').doc(depId);
            const depDoc = await transaction.get(depRef);
            if (!depDoc.exists || depDoc.data().status !== 'pending') return;

            const { userId, amount } = depDoc.data();
            const userRef = db.collection('users').doc(userId);
            const userDoc = await transaction.get(userRef);

            let currentBalance = 0;
            if (userDoc.exists) currentBalance = userDoc.data().balance || 0;

            transaction.update(userRef, { balance: currentBalance + amount });
            transaction.update(depRef, { status: 'approved' });

            try { await bot.telegram.sendMessage(userId, `🎉 অভিনন্দন! আপনার পাঠানো ${amount} টাকার রিকোয়েস্ট সফলভাবে কনফার্ম করা হয়েছে।`); } catch (e) {}
        });
        ctx.editMessageText(`${ctx.update.callback_query.message.text}\n\n🟢 **কনফার্ম করা হয়েছে**`);
    } catch (err) { ctx.reply("❌ ত্রুটি: " + err.message); }
});

bot.action(/reject_(.+)/, async (ctx) => {
    const depId = ctx.match[1];
    const depRef = db.collection('deposits').doc(depId);
    const depDoc = await depRef.get();
    
    if (depDoc.exists && depDoc.data().status === 'pending') {
        const { userId } = depDoc.data();
        await depRef.update({ status: 'rejected' });
        try { await bot.telegram.sendMessage(userId, `❌ দুঃখিত, আপনার ডিপোজিট রিকোয়েস্টটি রিজেক্ট করা হয়েছে।`); } catch (e) {}
    }
    ctx.editMessageText(`${ctx.update.callback_query.message.text}\n\n🔴 **রিজেক্ট করা হয়েছে**`);
});

bot.launch().catch(err => console.error('User Bot Error:', err));
