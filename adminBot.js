const { Telegraf, Markup } = require('telegraf');
const db = require('./firebaseConfig.js');
const bot = new Telegraf(process.env.ADMIN_BOT_TOKEN);
const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);

bot.use((ctx, next) => ctx.from.id === ADMIN_ID ? next() : ctx.reply("❌ Unauthorized"));

let activeSessions = {};

const keyboard = Markup.keyboard([
    ['➕ ফেসবুক আইডি যোগ করুন', '📝 কমেন্ট যোগ করুন'],
    ['📊 আইডি স্ট্যাটাস চেক']
]).resize();

bot.start((ctx) => ctx.reply('⚙️ অ্যাডমিন ড্যাশবোর্ড', keyboard));

bot.hears('➕ ফেসবুক আইডি যোগ করুন', (ctx) => {
    activeSessions[ctx.from.id] = { state: 'AWAITING_ID_PASS' };
    ctx.reply('নম্বর:পাসওয়ার্ড পাঠান');
});

bot.hears('📝 কমেন্ট যোগ করুন', (ctx) => {
    activeSessions[ctx.from.id] = { state: 'AWAITING_COMMENTS' };
    ctx.reply('প্রতি লাইনে একটি কমেন্ট পাঠান');
});

bot.hears('📊 আইডি স্ট্যাটাস চেক করুন', async (ctx) => { /* ... existing logic ... */ });

bot.on('text', async (ctx) => { /* ... existing session logic ... */ });

bot.launch();
