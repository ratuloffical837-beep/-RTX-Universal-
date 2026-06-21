const { Telegraf, Markup } = require('telegraf');
const db = require('./firebaseConfig.js');
const bot = new Telegraf(process.env.USER_BOT_TOKEN);
const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);

bot.start(async (ctx) => {
    const userId = ctx.from.id.toString();
    const username = ctx.from.first_name || "User";

    await db.collection('users').doc(userId).set({
        balance: 0,
        username,
        createdAt: new Date()
    }, { merge: true });

    ctx.reply('👋 RTX SMM প্যানেলে স্বাগতম!', 
        Markup.inlineKeyboard([[
            Markup.button.webApp('🚀 মিনি অ্যাপ ওপেন করুন', `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'your-domain.com'}`)
        ]])
    );
});

bot.on('web_app_data', async (ctx) => {
    try {
        const data = JSON.parse(ctx.message.webAppData.data);
        if (data.type === 'deposit') {
            await bot.telegram.sendMessage(ADMIN_ID, 
                `💰 নতুন ডিপোজিট!\nইউজার: ${data.username}\nটাকা: ${data.amount}৳\nTxID: ${data.txid}`,
                Markup.inlineKeyboard([[
                    Markup.button.callback('✅ Confirm', `approve_\( {data.userId}_ \){data.amount}`),
                    Markup.button.callback('❌ Reject', `reject_${data.userId}`)
                ]])
            );
        }
    } catch (e) { console.error(e); }
});

bot.action(/approve_(.+)_(.+)/, async (ctx) => { /* ... same as before ... */ });
bot.action(/reject_(.+)/, async (ctx) => { /* ... same as before ... */ });

bot.launch();
