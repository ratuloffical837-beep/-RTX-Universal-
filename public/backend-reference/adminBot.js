/**
 * RTX SMM Panel - Admin Telegram Bot
 * Handles FB account management and admin operations
 * 
 * ⚠️ THIS FILE IS FOR REFERENCE ONLY
 * Run this on your Node.js server
 */

const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

// Initialize bot (assumes Firebase already initialized)
const bot = new Telegraf(process.env.ADMIN_BOT_TOKEN);
const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);

// Get Firestore instance
const db = admin.firestore();

// Session management
const sessions = {};

// Admin-only middleware
bot.use((ctx, next) => {
  if (!ctx.from || ctx.from.id !== ADMIN_ID) {
    return ctx.reply("❌ আপনি এই সিস্টেমের অনুমোদিত অ্যাডমিন নন!");
  }
  return next();
});

// Main keyboard
const mainKeyboard = Markup.keyboard([
  ['👤 ফেসবুক আইডি যোগ', '📝 কমেন্ট যোগ'],
  ['🗑️ কমেন্ট ডিলেট', '📊 আইডি স্ট্যাটাস'],
  ['🔴 সমস্যাযুক্ত আইডি', '📈 সিস্টেম স্ট্যাটস']
]).resize();

// Start command
bot.start((ctx) => {
  ctx.reply(
    '⚙️ RTX SMM অ্যাডমিন প্যানেল সক্রিয় হয়েছে।\n\n' +
    'নিচের বাটন থেকে অপশন সিলেক্ট করুন:',
    mainKeyboard
  );
});

// Add Facebook Account
bot.hears('👤 ফেসবুক আইডি যোগ', async (ctx) => {
  sessions[ctx.from.id] = { state: 'AWAITING_FB_ACCOUNT' };
  
  await ctx.reply(
    '👤 ফেসবুক আইডি যোগ করতে নিচের ফরম্যাটে ডেটা পাঠান:\n\n' +
    '`নম্বর:নাম:কুকিজ`\n\n' +
    '**উদাহরণ:**\n' +
    '`01712345678:Rahim Khan:datr=xxx;c_user=xxx;xs=xxx;`\n\n' +
    '⚠️ কুকিজ সঠিক ফরম্যাটে দিন',
    { parse_mode: 'Markdown' }
  );
});

// Add Comments
bot.hears('📝 কমেন্ট যোগ', async (ctx) => {
  sessions[ctx.from.id] = { state: 'AWAITING_COMMENTS' };
  
  await ctx.reply(
    '📝 কমেন্ট ব্যাংকে নতুন কমেন্ট যোগ করতে প্রতি লাইনে একটি করে কমেন্ট লিখুন:\n\n' +
    '**উদাহরণ:**\n' +
    '```\nসুন্দর পোস্ট!\nঅনেক ভালো লাগলো\nAwesome content 👍\n```',
    { parse_mode: 'Markdown' }
  );
});

// Delete all comments
bot.hears('🗑️ কমেন্ট ডিলেট', async (ctx) => {
  try {
    const snapshot = await db.collection('comments_pool').get();
    
    if (snapshot.empty) {
      return ctx.reply('📭 কমেন্ট ব্যাংক আগে থেকেই খালি!');
    }
    
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    ctx.reply(`🗑️ সফলভাবে ${snapshot.size} টি কমেন্ট ডিলেট করা হয়েছে!`);
  } catch (err) {
    ctx.reply('❌ কমেন্ট ডিলেট করতে সমস্যা হয়েছে: ' + err.message);
  }
});

// Account Status
bot.hears('📊 আইডি স্ট্যাটাস', async (ctx) => {
  try {
    const snapshot = await db.collection('fb_accounts').get();
    
    let active = 0, dead = 0, checkpoint = 0, pending = 0, cooldown = 0;
    let totalComments = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      totalComments += data.totalCommentsDone || 0;
      
      switch (data.status) {
        case 'Active': active++; break;
        case 'Dead': dead++; break;
        case 'Checkpoint': checkpoint++; break;
        case 'PendingLogin': pending++; break;
        case 'Cooldown': cooldown++; break;
      }
    });
    
    ctx.reply(
      `📊 **ফেসবুক আইডি রিপোর্ট**\n\n` +
      `🟢 অ্যাক্টিভ: ${active} টি\n` +
      `🟡 চেকপয়েন্ট: ${checkpoint} টি\n` +
      `🔴 ডেড: ${dead} টি\n` +
      `⏳ পেন্ডিং: ${pending} টি\n` +
      `❄️ কুলডাউন: ${cooldown} টি\n\n` +
      `📈 মোট আইডি: ${snapshot.size} টি\n` +
      `💬 মোট কমেন্ট: ${totalComments} টি`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    ctx.reply('❌ ডাটা লোড করতে সমস্যা: ' + err.message);
  }
});

// Problematic accounts list
bot.hears('🔴 সমস্যাযুক্ত আইডি', async (ctx) => {
  try {
    const snapshot = await db.collection('fb_accounts')
      .where('status', 'in', ['Dead', 'Checkpoint'])
      .limit(20)
      .get();
    
    if (snapshot.empty) {
      return ctx.reply('🟢 সব আইডি ঠিক আছে! কোনো সমস্যা নেই।');
    }
    
    let message = '🔴 **সমস্যাযুক্ত আইডির তালিকা:**\n\n';
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      const statusEmoji = data.status === 'Checkpoint' ? '🟡' : '🔴';
      message += `${index + 1}. ${statusEmoji} ${data.name}\n   📞 ${data.phone} [${data.status}]\n\n`;
    });
    
    ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (err) {
    ctx.reply('❌ তালিকা লোড করতে সমস্যা: ' + err.message);
  }
});

// System Stats
bot.hears('📈 সিস্টেম স্ট্যাটস', async (ctx) => {
  try {
    const [usersSnap, ordersSnap, depositsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('orders').get(),
      db.collection('deposits').where('status', '==', 'approved').get()
    ]);
    
    let totalBalance = 0;
    usersSnap.forEach(doc => {
      totalBalance += doc.data().balance || 0;
    });
    
    let totalDeposits = 0;
    depositsSnap.forEach(doc => {
      totalDeposits += doc.data().amount || 0;
    });
    
    let completedOrders = 0;
    let processingOrders = 0;
    let totalOrderValue = 0;
    
    ordersSnap.forEach(doc => {
      const data = doc.data();
      totalOrderValue += data.totalCost || 0;
      if (data.status === 'Completed') completedOrders++;
      if (data.status === 'Processing' || data.status === 'Queued') processingOrders++;
    });
    
    ctx.reply(
      `📈 **সিস্টেম স্ট্যাটিস্টিক্স**\n\n` +
      `👥 মোট ইউজার: ${usersSnap.size} জন\n` +
      `💰 মোট ব্যালেন্স: ${totalBalance.toFixed(2)} BDT\n` +
      `💵 মোট ডিপোজিট: ${totalDeposits} BDT\n\n` +
      `📦 মোট অর্ডার: ${ordersSnap.size} টি\n` +
      `✅ সম্পন্ন: ${completedOrders} টি\n` +
      `⏳ চলমান: ${processingOrders} টি\n` +
      `💸 অর্ডার ভ্যালু: ${totalOrderValue} BDT`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    ctx.reply('❌ স্ট্যাটস লোড করতে সমস্যা: ' + err.message);
  }
});

// Handle text messages for sessions
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = sessions[userId];
  const text = ctx.message.text.trim();
  
  if (!session) return;
  
  // Handle FB Account Addition
  if (session.state === 'AWAITING_FB_ACCOUNT') {
    const parts = text.split(':');
    
    if (parts.length < 3) {
      return ctx.reply('❌ ভুল ফরম্যাট! `নম্বর:নাম:কুকিজ` এভাবে দিন।');
    }
    
    const phone = parts[0].trim();
    const name = parts[1].trim();
    const cookieRaw = parts.slice(2).join(':').trim();
    
    // Parse cookies to JSON array
    const cookieArray = cookieRaw.split(';').map(pair => {
      const cleanPair = pair.trim();
      if (!cleanPair) return null;
      
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
    
    if (cookieArray.length === 0) {
      return ctx.reply('❌ কুকিজ পার্স করা যায়নি! সঠিক ফরম্যাটে দিন।');
    }
    
    try {
      await db.collection('fb_accounts').doc(phone).set({
        phone,
        name,
        cookies: JSON.stringify(cookieArray),
        status: 'PendingLogin',
        totalCommentsDone: 0,
        errorCount: 0,
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUsed: admin.firestore.FieldValue.serverTimestamp()
      });
      
      delete sessions[userId];
      
      // Delete original message for security
      try {
        await ctx.deleteMessage();
      } catch (e) {}
      
      ctx.reply(
        `⏳ **আইডি ভেরিফিকেশন কিউতে যুক্ত**\n\n` +
        `👤 নাম: ${name}\n` +
        `📞 নম্বর: ${phone}\n\n` +
        `ব্যাকএন্ড স্বয়ংক্রিয়ভাবে চেক করবে...`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      ctx.reply('❌ আইডি যোগ করতে সমস্যা: ' + err.message);
    }
    
    return;
  }
  
  // Handle Comments Addition
  if (session.state === 'AWAITING_COMMENTS') {
    const comments = text.split('\n')
      .map(c => c.trim())
      .filter(c => c.length > 0);
    
    if (comments.length === 0) {
      return ctx.reply('❌ কোনো বৈধ কমেন্ট পাওয়া যায়নি!');
    }
    
    try {
      const batch = db.batch();
      
      comments.forEach(comment => {
        const docRef = db.collection('comments_pool').doc();
        batch.set(docRef, {
          text: comment,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      
      delete sessions[userId];
      
      ctx.reply(`✅ সফলভাবে ${comments.length} টি নতুন কমেন্ট যোগ হয়েছে!`);
    } catch (err) {
      ctx.reply('❌ কমেন্ট যোগ করতে সমস্যা: ' + err.message);
    }
    
    return;
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('[Admin Bot Error]:', err);
  ctx.reply('❌ একটি ত্রুটি ঘটেছে!');
});

// Launch Admin Bot with Timeout Fix
bot.launch({
  polling: {
    timeout: 30,
    limit: 100
  }
}).then(() => console.log('[Admin Bot] ✅ Bot started successfully'))
  .catch(err => {
    console.error('[Admin Bot] ❌ Launch failed, retrying in 5s...', err);
    setTimeout(() => {
      bot.launch({ polling: { timeout: 30, limit: 100 } })
        .then(() => console.log('[Admin Bot] ✅ Bot started after retry'))
        .catch(e => console.error('[Admin Bot] ❌ Retry failed:', e));
    }, 5000);
  });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
