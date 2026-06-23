/**
 * RTX SMM Panel - User Telegram Bot
 * Handles user interactions and deposit notifications
 * 
 * ⚠️ THIS FILE IS FOR REFERENCE ONLY
 * Run this on your Node.js server
 */

const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

// Initialize bot (assumes Firebase already initialized)
const bot = new Telegraf(process.env.USER_BOT_TOKEN);
const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);
const WEBAPP_URL = process.env.WEBAPP_URL || `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;

// Get Firestore instance
const db = admin.firestore();

// Track startup time for snapshot filtering
const startupTime = new Date();

// Start command
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.first_name || 'User';
  const fullName = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create new user
      await userRef.set({
        username: fullName,
        balance: 0,
        photoUrl: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Update username
      await userRef.update({
        username: fullName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await ctx.reply(
      `👋 **স্বাগতম, ${username}!**\n\n` +
      `🚀 **RTX SMM Panel** এ আপনাকে অভিনন্দন!\n\n` +
      `আমাদের সার্ভিস:\n` +
      `• ফেসবুক অটো কমেন্ট\n` +
      `• রিয়েল বাংলাদেশি কমেন্ট\n` +
      `• ২৪/৭ সাপোর্ট\n\n` +
      `💰 **রেট:** ১ কমেন্ট = ২ টাকা\n\n` +
      `নিচের বাটনে ক্লিক করে মিনি অ্যাপ ওপেন করুন:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🚀 মিনি অ্যাপ ওপেন করুন', WEBAPP_URL)],
          [Markup.button.url('💬 সাপোর্ট', 'https://t.me/Ratul')]
        ])
      }
    );
  } catch (err) {
    console.error('[User Start Error]:', err);
    ctx.reply('❌ একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
  }
});

// Balance command
bot.command('balance', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return ctx.reply('❌ অ্যাকাউন্ট পাওয়া যায়নি! /start দিয়ে শুরু করুন।');
    }
    
    const balance = userDoc.data().balance || 0;
    
    ctx.reply(
      `💰 **আপনার ব্যালেন্স**\n\n` +
      `৳ ${balance.toFixed(2)} BDT\n\n` +
      `ডিপোজিট করতে মিনি অ্যাপ ওপেন করুন।`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    ctx.reply('❌ ব্যালেন্স দেখতে সমস্যা হয়েছে।');
  }
});

// Orders command
bot.command('orders', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  try {
    const snapshot = await db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    if (snapshot.empty) {
      return ctx.reply('📭 কোনো অর্ডার পাওয়া যায়নি!');
    }
    
    let message = '📋 **আপনার সাম্প্রতিক অর্ডার:**\n\n';
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      const statusEmoji = {
        'Completed': '✅',
        'Processing': '⚡',
        'Queued': '⏳',
        'Failed': '❌'
      }[data.status] || '❓';
      
      message += `${index + 1}. ${statusEmoji} ${data.status}\n`;
      message += `   💬 ${data.commentsDone}/${data.targetComments} কমেন্ট\n`;
      message += `   💵 ${data.totalCost} BDT\n\n`;
    });
    
    ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (err) {
    ctx.reply('❌ অর্ডার দেখতে সমস্যা হয়েছে।');
  }
});

// Help command
bot.command('help', (ctx) => {
  ctx.reply(
    `ℹ️ **RTX SMM Panel সাহায্য**\n\n` +
    `**কমান্ড:**\n` +
    `/start - বট শুরু করুন\n` +
    `/balance - ব্যালেন্স দেখুন\n` +
    `/orders - অর্ডার হিস্ট্রি\n` +
    `/help - সাহায্য\n\n` +
    `**কিভাবে ব্যবহার করবেন:**\n` +
    `1. মিনি অ্যাপ ওপেন করুন\n` +
    `2. ডিপোজিট করুন (বিকাশ/নগদ)\n` +
    `3. অর্ডার প্লেস করুন\n` +
    `4. অপেক্ষা করুন!\n\n` +
    `📞 **সাপোর্ট:** @Ratul`,
    { parse_mode: 'Markdown' }
  );
});

// Listen for new deposits (real-time)
db.collection('deposits')
  .where('status', '==', 'pending')
  .where('createdAt', '>=', startupTime)
  .onSnapshot((snapshot) => {
    if (!snapshot) return;
    
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        const docId = change.doc.id;
        
        try {
          await bot.telegram.sendMessage(
            ADMIN_ID,
            `💰 **নতুন ডিপোজিট রিকোয়েস্ট!**\n\n` +
            `👤 ইউজার: ${data.username}\n` +
            `🆔 ID: ${data.userId}\n` +
            `📞 ফোন: ${data.userPhone}\n` +
            `💵 পরিমাণ: ${data.amount} BDT\n` +
            `🔑 TxID: ${data.txid}\n\n` +
            `⏰ সময়: ${new Date().toLocaleString('bn-BD')}`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('✅ Approve', `approve_${docId}`),
                  Markup.button.callback('❌ Reject', `reject_${docId}`)
                ]
              ])
            }
          );
        } catch (err) {
          console.error('[Deposit Notification Error]:', err);
        }
      }
    });
  });

// Handle deposit approval
bot.action(/approve_(.+)/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  const docId = ctx.match[1];
  
  try {
    await db.runTransaction(async (transaction) => {
      const depRef = db.collection('deposits').doc(docId);
      const depDoc = await transaction.get(depRef);
      
      if (!depDoc.exists) {
        throw new Error('Deposit not found');
      }
      
      const depData = depDoc.data();
      
      if (depData.status !== 'pending') {
        throw new Error('Already processed');
      }
      
      const userRef = db.collection('users').doc(depData.userId);
      const userDoc = await transaction.get(userRef);
      
      let currentBalance = 0;
      if (userDoc.exists) {
        currentBalance = userDoc.data().balance || 0;
      }
      
      // Update user balance
      transaction.update(userRef, {
        balance: currentBalance + depData.amount
      });
      
      // Update deposit status
      transaction.update(depRef, {
        status: 'approved',
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Notify user
      try {
        await bot.telegram.sendMessage(
          depData.userId,
          `🎉 **অভিনন্দন!**\n\n` +
          `আপনার ${depData.amount} টাকার ডিপোজিট সফলভাবে যুক্ত হয়েছে!\n\n` +
          `💰 নতুন ব্যালেন্স: ${(currentBalance + depData.amount).toFixed(2)} BDT`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {}
    });
    
    await ctx.editMessageText(
      ctx.update.callback_query.message.text + '\n\n🟢 **✅ Approved**',
      { parse_mode: 'Markdown' }
    );
    
  } catch (err) {
    ctx.reply('❌ Error: ' + err.message);
  }
});

// Handle deposit rejection
bot.action(/reject_(.+)/, async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  
  const docId = ctx.match[1];
  
  try {
    const depRef = db.collection('deposits').doc(docId);
    const depDoc = await depRef.get();
    
    if (!depDoc.exists) {
      return ctx.reply('❌ Deposit not found');
    }
    
    const depData = depDoc.data();
    
    if (depData.status !== 'pending') {
      return ctx.reply('❌ Already processed');
    }
    
    await depRef.update({
      status: 'rejected',
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Notify user
    try {
      await bot.telegram.sendMessage(
        depData.userId,
        `❌ **দুঃখিত!**\n\n` +
        `আপনার ${depData.amount} টাকার ডিপোজিট রিকোয়েস্ট বাতিল হয়েছে।\n\n` +
        `কারণ জানতে সাপোর্টে যোগাযোগ করুন।`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
    
    await ctx.editMessageText(
      ctx.update.callback_query.message.text + '\n\n🔴 **❌ Rejected**',
      { parse_mode: 'Markdown' }
    );
    
  } catch (err) {
    ctx.reply('❌ Error: ' + err.message);
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('[User Bot Error]:', err);
});

// Launch bot
bot.launch()
  .then(() => console.log('[User Bot] ✅ Bot started successfully'))
  .catch(err => console.error('[User Bot] ❌ Launch failed:', err));

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
