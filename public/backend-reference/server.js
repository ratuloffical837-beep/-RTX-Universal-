/**
 * RTX SMM Panel - Anti-Ban Backend Automation Engine
 * Node.js + Puppeteer Extra Stealth
 * 
 * ⚠️ THIS FILE IS FOR REFERENCE ONLY
 * Run this on your Node.js server (Render, Railway, VPS, etc.)
 * 
 * Required Environment Variables:
 * - FIREBASE_SERVICE_ACCOUNT_BASE64: Base64 encoded Firebase service account JSON
 * - ADMIN_BOT_TOKEN: Telegram Admin Bot Token
 * - USER_BOT_TOKEN: Telegram User Bot Token  
 * - ADMIN_TELEGRAM_ID: Admin's Telegram User ID
 * - PORT: Server port (default: 3000)
 */

const express = require('express');
const path = require('path');
const admin = require('firebase-admin');

// ==================== FIREBASE INITIALIZATION ====================
let db;

function initializeFirebase() {
  if (!admin.apps.length) {
    try {
      const base64Auth = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
      if (!base64Auth) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is missing!");
      }
      
      const serviceAccount = JSON.parse(
        Buffer.from(base64Auth, 'base64').toString('utf-8')
      );

      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      
      db = admin.firestore();
      console.log("[Firebase] ✅ Infrastructure synced successfully");
    } catch (error) {
      console.error("[Firebase] ❌ Initialization failed:", error.message);
      process.exit(1);
    }
  }
  return db;
}

db = initializeFirebase();

// ==================== EXPRESS SERVER ====================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Order API Endpoint
app.post('/api/order', async (req, res) => {
  try {
    const { userId, link, targetComments } = req.body;
    
    if (!userId || !link || !targetComments) {
      return res.status(400).json({ error: "সবগুলো ফিল্ড পূরণ করা বাধ্যতামুলক!" });
    }

    const parsedComments = parseInt(targetComments);
    if (parsedComments <= 0) {
      return res.status(400).json({ error: "ভুল কমেন্ট সংখ্যা!" });
    }

    const userRef = db.collection('users').doc(userId.toString());
    
    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error("ইউজার অ্যাকাউন্ট পাওয়া যায়নি! প্রথমে বটে /start দিন।");
      }

      const currentBalance = userDoc.data().balance || 0;
      const costPerComment = 2;
      const totalCost = parsedComments * costPerComment;

      if (currentBalance < totalCost) {
        throw new Error("❌ পর্যাপ্ত ব্যালেন্স নেই!");
      }

      // Deduct balance
      transaction.update(userRef, { balance: currentBalance - totalCost });

      // Create order
      const orderRef = db.collection('orders').doc();
      transaction.set(orderRef, {
        userId: userId.toString(),
        link: link.trim(),
        targetComments: parsedComments,
        commentsDone: 0,
        totalCost,
        status: "Queued",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { 
        success: true, 
        orderId: orderRef.id,
        newBalance: currentBalance - totalCost 
      };
    });

    res.json(result);
    
  } catch (err) {
    console.error('[Order API Error]:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[RTX SMM] 🚀 Server running on port ${PORT}`);
});

// ==================== PUPPETEER AUTOMATION ENGINE ====================
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// User Agent Pool for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
];

// Viewport configurations for randomization
const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 414, height: 896 },
];

// Random delay helper
const randomDelay = (min, max) => {
  return new Promise(resolve => 
    setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
  );
};

// Human-like typing with random delays
async function humanType(page, selector, text) {
  const element = await page.$(selector);
  if (!element) return false;
  
  await element.click();
  await randomDelay(100, 300);
  
  for (const char of text) {
    await element.type(char, { delay: Math.floor(Math.random() * 150) + 100 });
    
    // Occasional pause for realism
    if (Math.random() < 0.1) {
      await randomDelay(200, 500);
    }
  }
  
  return true;
}

// Get random comment from pool
async function getRandomComment() {
  try {
    const snapshot = await db.collection('comments_pool').get();
    if (snapshot.empty) return null;
    
    const comments = [];
    snapshot.forEach(doc => comments.push(doc.data().text));
    
    return comments[Math.floor(Math.random() * comments.length)];
  } catch (err) {
    console.error('[Comment Pool Error]:', err.message);
    return null;
  }
}

// Get idle FB account (Longest-Idle-First strategy)
async function getIdleAccount() {
  try {
    const snapshot = await db.collection('fb_accounts')
      .where('status', '==', 'Active')
      .orderBy('lastUsed', 'asc')
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (err) {
    console.error('[Get Account Error]:', err.message);
    return null;
  }
}

// Mark account as used
async function markAccountUsed(accountId, success = true) {
  try {
    const updateData = {
      lastUsed: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    if (success) {
      updateData.totalCommentsDone = admin.firestore.FieldValue.increment(1);
      updateData.errorCount = 0;
    } else {
      updateData.errorCount = admin.firestore.FieldValue.increment(1);
    }
    
    await db.collection('fb_accounts').doc(accountId).update(updateData);
  } catch (err) {
    console.error('[Mark Account Error]:', err.message);
  }
}

// Flag problematic account
async function flagAccount(accountId, status) {
  try {
    await db.collection('fb_accounts').doc(accountId).update({
      status,
      lastUsed: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`[Account Flagged] ${accountId} -> ${status}`);
  } catch (err) {
    console.error('[Flag Account Error]:', err.message);
  }
}

// Process single comment with stealth
async function processComment(order, account) {
  let browser = null;
  
  try {
    // Random configuration for this session
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const viewport = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
    
    // Launch browser with stealth settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=' + viewport.width + ',' + viewport.height,
        '--disable-features=IsolateOrigins,site-per-process',
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ 
      width: viewport.width, 
      height: viewport.height, 
      isMobile: true, 
      hasTouch: true 
    });
    await page.setUserAgent(userAgent);
    
    // Parse and inject cookies
    const cookies = JSON.parse(account.cookies);
    await page.setCookie(...cookies);
    
    // Warm-up: Visit homepage first for natural traffic pattern
    await page.goto('https://mbasic.facebook.com/', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    await randomDelay(1000, 2000);
    
    // Scroll naturally
    await page.evaluate(() => window.scrollBy(0, Math.random() * 300 + 100));
    await randomDelay(500, 1000);
    
    // Navigate to target post
    let targetUrl = order.link.replace('www.facebook.com', 'mbasic.facebook.com');
    targetUrl = targetUrl.replace('m.facebook.com', 'mbasic.facebook.com');
    
    await page.goto(targetUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    await randomDelay(1500, 3000);
    
    // Check for checkpoint/block
    const pageContent = await page.content();
    
    if (pageContent.includes('checkpoint') || 
        pageContent.includes('login') ||
        pageContent.includes('submit_code')) {
      await flagAccount(account.id, 'Checkpoint');
      return { success: false, reason: 'checkpoint' };
    }
    
    // Find comment textarea
    let commentArea = await page.$('textarea[name="comment_text"]');
    
    // If not found, try to find comment link and click it
    if (!commentArea) {
      const commentLink = await page.$('a[href*="comment"]');
      if (commentLink) {
        await Promise.all([
          commentLink.click(),
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
        ]);
        await randomDelay(1000, 2000);
        commentArea = await page.$('textarea[name="comment_text"]');
      }
    }
    
    if (!commentArea) {
      await flagAccount(account.id, 'Dead');
      return { success: false, reason: 'no_textarea' };
    }
    
    // Get random comment
    const comment = await getRandomComment();
    if (!comment) {
      return { success: false, reason: 'no_comments' };
    }
    
    // Type comment with human-like behavior
    await humanType(page, 'textarea[name="comment_text"]', comment);
    await randomDelay(500, 1000);
    
    // Find and click submit button
    const submitButton = await page.$('input[name="submit"]') || 
                         await page.$('input[type="submit"]') ||
                         await page.$('button[type="submit"]');
    
    if (!submitButton) {
      return { success: false, reason: 'no_submit_button' };
    }
    
    // Submit comment
    await Promise.all([
      submitButton.click(),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
    ]);
    
    await randomDelay(2000, 4000);
    
    // Check for block after posting
    const finalContent = await page.content();
    
    if (finalContent.includes('temporarily blocked') || 
        finalContent.includes('action is blocked') ||
        finalContent.includes('try again later')) {
      await flagAccount(account.id, 'Dead');
      return { success: false, reason: 'blocked' };
    }
    
    // Success!
    await markAccountUsed(account.id, true);
    return { success: true };
    
  } catch (err) {
    console.error('[Comment Processing Error]:', err.message);
    await markAccountUsed(account.id, false);
    return { success: false, reason: err.message };
    
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}

// Main automation loop
async function processOrders() {
  try {
    // Get next order to process
    const orderSnapshot = await db.collection('orders')
      .where('status', 'in', ['Queued', 'Processing'])
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();
    
    if (orderSnapshot.empty) {
      return setTimeout(processOrders, 10000);
    }
    
    const orderDoc = orderSnapshot.docs[0];
    const order = { id: orderDoc.id, ...orderDoc.data() };
    
    // Check if order is complete
    if (order.commentsDone >= order.targetComments) {
      await orderDoc.ref.update({ 
        status: 'Completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`[Order Complete] ${order.id}`);
      return setTimeout(processOrders, 2000);
    }
    
    // Update status to Processing
    if (order.status === 'Queued') {
      await orderDoc.ref.update({ status: 'Processing' });
    }
    
    // Get idle account
    const account = await getIdleAccount();
    
    if (!account) {
      console.log('[No Active Accounts] Waiting...');
      return setTimeout(processOrders, 30000);
    }
    
    console.log(`[Processing] Order: ${order.id} | Account: ${account.name}`);
    
    // Process comment
    const result = await processComment(order, account);
    
    if (result.success) {
      // Increment comment count
      await orderDoc.ref.update({
        commentsDone: admin.firestore.FieldValue.increment(1)
      });
      console.log(`[Success] Comment posted | Order: ${order.id}`);
    } else {
      console.log(`[Failed] ${result.reason} | Order: ${order.id}`);
    }
    
    // Random delay before next iteration
    const nextDelay = Math.floor(Math.random() * 5000) + 8000; // 8-13 seconds
    setTimeout(processOrders, nextDelay);
    
  } catch (err) {
    console.error('[Process Orders Error]:', err.message);
    setTimeout(processOrders, 15000);
  }
}

// Account login verification loop
async function verifyPendingAccounts() {
  let browser = null;
  
  try {
    const snapshot = await db.collection('fb_accounts')
      .where('status', '==', 'PendingLogin')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return setTimeout(verifyPendingAccounts, 10000);
    }
    
    const doc = snapshot.docs[0];
    const account = { id: doc.id, ...doc.data() };
    
    console.log(`[Verifying Account] ${account.name}`);
    
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
    await page.setUserAgent(USER_AGENTS[0]);
    
    // Inject cookies
    const cookies = JSON.parse(account.cookies);
    await page.setCookie(...cookies);
    
    // Visit profile page
    await page.goto('https://mbasic.facebook.com/me', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    const content = await page.content();
    
    const isCheckpoint = content.includes('checkpoint') || 
                         content.includes('login') ||
                         content.includes('submit_code');
    
    const isLoggedIn = await page.$('a[href*="logout"]') !== null;
    
    if (isLoggedIn && !isCheckpoint) {
      await doc.ref.update({ 
        status: 'Active',
        lastUsed: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`[Account Verified] ${account.name} -> Active`);
    } else if (isCheckpoint) {
      await doc.ref.update({ status: 'Checkpoint' });
      console.log(`[Account Checkpoint] ${account.name}`);
    } else {
      await doc.ref.update({ status: 'Dead' });
      console.log(`[Account Dead] ${account.name}`);
    }
    
  } catch (err) {
    console.error('[Verify Account Error]:', err.message);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
  
  setTimeout(verifyPendingAccounts, 10000);
}

// Start automation loops
console.log('[RTX SMM] 🤖 Starting automation engine...');
setTimeout(processOrders, 5000);
setTimeout(verifyPendingAccounts, 3000);

// ==================== TELEGRAM BOTS ====================
// Note: Import these from separate files in production
 require('./adminBot.js');
 require('./userBot.js');

console.log('[RTX SMM] ✅ All systems initialized');
