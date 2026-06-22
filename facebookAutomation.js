const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const db = require('./firebaseConfig.js');
const { Telegram } = require('telegraf');

const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);
const tg = new Telegram(process.env.ADMIN_BOT_TOKEN);

async function checkPendingLogins() {
    let browser = null;
    try {
        const snapshot = await db.collection('fb_accounts').where('status', '==', 'PendingLogin').limit(1).get();
        if (snapshot.empty) return setTimeout(checkPendingLogins, 10000);

        const doc = snapshot.docs[0];
        const account = doc.data();
        
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=360,740']
        });
        const page = await browser.newPage();
        
        // রিয়ালিস্টিক ভিউপোর্ট ও টাচ ইমুলেশন মেকানিজম
        await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');

        const parsedCookies = JSON.parse(account.cookies);
        await page.setCookie(...parsedCookies);

        // অ্যাকাউন্ট ওয়ার্ম-আপ স্টেপ: ট্রাফিক ন্যাচারাল দেখাতে আগে হোমপেজে ভিজিট
        await page.goto('https://mbasic.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.evaluate(() => window.scrollBy(0, 300));
        
        await page.goto('https://mbasic.facebook.com/profile.php', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const pageContent = await page.content();
        const isCheckpoint = pageContent.includes('checkpoint') || pageContent.includes('approve this login') || pageContent.includes('submit_code') || pageContent.includes('login_source');
        const loginSuccess = (await page.$('a[href*="logout"]')) !== null || (await page.$('input[name="fb_dtsg"]')) !== null;

        if (loginSuccess) {
            await db.collection('fb_accounts').doc(account.phone).update({ status: 'Active' });
            await tg.sendMessage(ADMIN_ID, `✅ সফলভাবে ফেসবুক আইডি যুক্ত হয়েছে:\n👤 নাম: ${account.name}\n📞 ফোন: ${account.phone}`);
        } else if (isCheckpoint) {
            await db.collection('fb_accounts').doc(account.phone).update({ status: 'Checkpoint' });
            await tg.sendMessage(ADMIN_ID, `⚠️ ফেসবুক আইডি চেকপয়েন্টে (Lock) আটকে গেছে! ম্যানুয়ালি এপ্রুভ করুন:\n👤 নাম: ${account.name}`);
        } else {
            throw new Error("কুকি এক্সপায়ারড বা অবৈধ রিডাইরেকশন!");
        }
    } catch (err) {
        console.error("[Login Queue Watcher Error]:", err.message);
        const doc = (await db.collection('fb_accounts').where('status', '==', 'PendingLogin').limit(1).get()).docs[0];
        if (doc) {
            await db.collection('fb_accounts').doc(doc.id).update({ status: 'Dead' });
            await tg.sendMessage(ADMIN_ID, `❌ আইডি (${doc.id}) লগইন ব্যর্থ হয়েছে। কুকি রি-চেক করুন।`);
        }
    } finally {
        if (browser) await browser.close(); // র্যাম ওভারফ্লো ও মেমোরি ফিক্স
    }
    setTimeout(checkPendingLogins, 10000);
}

let lastUsedIndex = 0;

async function processComments() {
    let browser = null;
    try {
        const orderSnapshot = await db.collection('orders').where('status', '==', 'Processing').limit(1).get();
        if (orderSnapshot.empty) return setTimeout(processComments, 12000);

        const orderDoc = orderSnapshot.docs[0];
        const orderData = orderDoc.data();

        if (orderData.commentsDone >= orderData.targetComments) {
            await orderDoc.ref.update({ status: 'Completed' });
            return setTimeout(processComments, 2000);
        }

        const fbSnapshot = await db.collection('fb_accounts').where('status', '==', 'Active').get();
        if (fbSnapshot.empty) return setTimeout(processComments, 15000);

        const fbDocs = fbSnapshot.docs;
        if (lastUsedIndex >= fbDocs.length) lastUsedIndex = 0;
        const currentFb = fbDocs[lastUsedIndex].data();
        lastUsedIndex++;

        const commentSnapshot = await db.collection('comment_bank').get();
        if (commentSnapshot.empty) return setTimeout(processComments, 15000);
        const randomComment = commentSnapshot.docs[Math.floor(Math.random() * commentSnapshot.docs.length)].data().text;

        // পুপেটিয়ার লঞ্চিং সেফগার্ড ব্লক (র‍্যাম ক্র্যাশ রেসিস্ট্যান্স)
        try {
            browser = await puppeteer.launch({ 
                headless: true, 
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=360,740'] 
            });
        } catch (launchErr) {
            console.error("Puppeteer Launch Failed due to Memory Crunch:", launchErr.message);
            return setTimeout(processComments, 15000);
        }

        const page = await browser.newPage();
        await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');
        
        await page.setCookie(...JSON.parse(currentFb.cookies));
        
        let targetUrl = orderData.link.replace('www.facebook.com', 'mbasic.facebook.com');
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // রিডাইরেকশন প্যারামিটার ও ট্র্যাকিং ডিফেন্স চেক
        let hasTextArea = await page.waitForSelector('textarea[name="comment_text"]', { timeout: 6000 }).catch(() => null);
        
        // যদি রিডাইরেকশনের কারণে টেক্সট-এরিয়া না পাওয়া যায়, তবে রি-ট্রাই মেকানিজম
        if (!hasTextArea) {
            const alternativeAnchor = await page.$('a[href*="comment/replies"], a[href*="story.php"]');
            if (alternativeAnchor) {
                await Promise.all([
                    alternativeAnchor.click(),
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
                ]);
                hasTextArea = await page.waitForSelector('textarea[name="comment_text"]', { timeout: 5000 }).catch(() => null);
            }
        }

        if (hasTextArea) {
            await page.type('textarea[name="comment_text"]', randomComment);
            const submitSelector = (await page.$('input[name="submit"]')) ? 'input[name="submit"]' : 'input[type="submit"]';
            
            await Promise.all([
                page.click(submitSelector),
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
            ]);

            const pageContent = await page.content();
            const isBlocked = pageContent.includes('temporarily blocked') || pageContent.includes('action is blocked');

            if (!isBlocked) {
                await orderDoc.ref.update({ commentsDone: orderData.commentsDone + 1 });
            } else {
                await db.collection('fb_accounts').doc(currentFb.phone).update({ status: 'Dead' });
                await tg.sendMessage(ADMIN_ID, `🔴 কমেন্ট ব্লক খেয়েছে: ${currentFb.name}`);
            }
        } else {
            // আইডি চেকিং ফিল্টার: এটিকে সরাসরি ডেড না করে চেকপয়েন্ট কিনা রি-ভেরিফাই করা হচ্ছে
            const pageHtml = await page.content();
            if (pageHtml.includes('checkpoint') || pageHtml.includes('login')) {
                await db.collection('fb_accounts').doc(currentFb.phone).update({ status: 'Checkpoint' });
                await tg.sendMessage(ADMIN_ID, `⚠️ আইডি সেশন আউট হয়ে চেকপয়েন্টে পড়েছে: ${currentFb.name}`);
            } else {
                await db.collection('fb_accounts').doc(currentFb.phone).update({ status: 'Dead' });
                await tg.sendMessage(ADMIN_ID, `🔴 সেশন আউট বা লগআউট: ${currentFb.name}`);
            }
        }
    } catch (globalErr) { 
        console.error("[Automation Engine Exception]:", globalErr.message); 
    } finally { 
        if (browser) await browser.close(); 
    }
    setTimeout(processComments, 12000); 
}

setTimeout(checkPendingLogins, 3000);
setTimeout(processComments, 5000);
