const { Telegraf, Markup } = require('telegraf');
const db = require('./firebaseConfig.js');
const bot = new Telegraf(process.env.USER_BOT_TOKEN);
const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);

bot.start(async (ctx) => {
    const userId = ctx.from.id.toString();
    const username = ctx.from.first_name || "User";

    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            await userRef.set({
                balance: 0.00,
                username: username,
                createdAt: new Date()
            });
            console.log(`[User System] Initialized account document for ID: ${userId}`);
        }
    } catch (e) {
        console.error("User document auto-init skipped:", e.message);
    }

    ctx.reply('👋 👋 RTX SMM প্যানেলে স্বাগতম! লাইক ও কমেন্ট সার্ভিস নিতে নিচের বাটন থেকে মিনি অ্যাপ ওপেন করুন।', 
    Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 ওপেন মিনি অ্যাপ', `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:3000'}`)]
    ]));
});

bot.on('web_app_data', async (ctx) => {
    try {
        const data = JSON.parse(ctx.message.webAppData.data);
        if (data.type === 'deposit') {
            const { userId, username, amount, txid } = data;

            await bot.telegram.sendMessage(ADMIN_ID, 
                `💰 **নতুন ডিপোজিট রিকোয়েস্ট!**\n\n👤 ইউজার: ${username} (ID: ${userId})\n💵 পরিমাণ: ${amount} ৳\n🔑 TxID: ${txid}`,
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback('✅ Confirm', `approve_${userId}_${amount}`),
                        Markup.button.callback('❌ Reject', `reject_${userId}`)
                    ]
                ])
            );
            ctx.reply('✅ আপনার ডিপোজিট রিকোয়েস্ট অ্যাডমিনের কাছে পাঠানো হয়েছে। ভেরিফাই করে দ্রুত ব্যালেন্স যোগ করা হবে।');
        }
    } catch (e) {
        console.error("Web App Data Payload Error:", e.message);
    }
});

bot.action(/approve_(.+)_(.+)/, async (ctx) => {
    const userId = ctx.match[1];
    const amount = parseInt(ctx.match[2]);

    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async (transaction) => {
        const sfDoc = await transaction.get(userRef);
        let newBalance = amount;
        if (sfDoc.exists) {
            newBalance = (sfDoc.data().balance || 0) + amount;
        }
        transaction.set(userRef, { balance: newBalance }, { merge: true });
    });

    try { await bot.telegram.sendMessage(userId, `🎉 অভিনন্দন! আপনার পাঠানো ${amount} ৳ ডিপোজিট সফলভাবে কনফার্ম করা হয়েছে।`); } catch (e) {}
    ctx.editMessageText(`${ctx.update.callback_query.message.text}\n\n🟢 **কনফার্ম করা হয়েছে**`);
});

bot.action(/reject_(.+)/, async (ctx) => {
    const userId = ctx.match[1];
    try { await bot.telegram.sendMessage(userId, `❌ দুঃখিত, আপনার ডিপোজিট রিকোয়েস্টটি সঠিক না থাকায় রিজেক্ট করা হয়েছে।`); } catch (e) {}
    ctx.editMessageText(`${ctx.update.callback_query.message.text}\n\n🔴 **রিজেক্ট করা হয়েছে**`);
});

bot.launch().catch(err => console.error('User Bot Fatal Error:', err));
