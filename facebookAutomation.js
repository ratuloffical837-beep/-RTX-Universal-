const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const db = require('./firebaseConfig.js');
const { Telegram } = require('telegraf');

const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);
const tg = new Telegram(process.env.ADMIN_BOT_TOKEN);

async function checkPendingLogins() {
    try {
        const snapshot = await db.collection('fb_accounts').where('status', '==', 'PendingLogin').limit(1).get();
        if (snapshot.empty) return setTimeout(checkPendingLogins, 10000);

        const doc = snapshot.docs[0];
        const account = doc.data();
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');

        const parsedCookies = JSON.parse(account.cookies);
        await page.setCookie(...parsedCookies);

        await page.goto('https://mbasic.facebook.com/profile.php', { waitUntil: 'domcontentloaded', timeout: 30000 });
        const loginSuccess = (await page.$('a[href*="logout"]')) !== null || (await page.$('input[name="fb_dtsg"]')) !== null;

        if (loginSuccess) {
            await db.collection('fb_accounts').doc(account.phone).update({ status: 'Active' });
            await tg.sendMessage(ADMIN_ID, `✅ সফলভাবে ফেসবুক আইডি যুক্ত হয়েছে:\n👤 নাম: ${account.name}\n📞 ফোন: ${account.phone}`);
        } else {
            throw new Error("কুকি এক্সপায়ারড বা ইনভ্যালিড!");
        }
        await browser.close();
    } catch (err) {
        const doc = (await db.collection('fb_accounts').where('status', '==', 'PendingLogin').limit(1).get()).docs[0];
        if (doc) {
            await db.collection('fb_accounts').doc(doc.id).update({ status: 'Dead' });
            await tg.sendMessage(ADMIN_ID, `❌ আইডি (${doc.id}) লগইন ব্যর্থ হয়েছে। কুকি রি-চেক করুন।`);
        }
    }
    setTimeout(checkPendingLogins, 10000);
}

let lastUsedIndex = 0;

async function processComments() {
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
        // রাউন্ড-রবিন লজিক (১ম আইডি ১টি -> ২য় আইডি ১টি -> ক্রমিক বজায় রাখা)
        if (lastUsedIndex >= fbDocs.length) lastUsedIndex = 0;
        const currentFb = fbDocs[lastUsedIndex].data();
        lastUsedIndex++;

        const commentSnapshot = await db.collection('comment_bank').get();
        if (commentSnapshot.empty) return setTimeout(processComments, 15000);
        const randomComment = commentSnapshot.docs[Math.floor(Math.random() * commentSnapshot.docs.length)].data().text;

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
        const page = await browser.newPage();
        
        try {
            await page.setCookie(...JSON.parse(currentFb.cookies));
            let targetUrl = orderData.link.replace('www.facebook.com', 'mbasic.facebook.com');
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const hasTextArea = await page.waitForSelector('textarea[name="comment_text"]', { timeout: 6000 }).catch(() => null);

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
                    console.log(`[Worker] ${currentFb.name} কমেন্ট করেছে।`);
                } else {
                    await db.collection('fb_accounts').doc(currentFb.phone).update({ status: 'Dead' });
                    await tg.sendMessage(ADMIN_ID, `🔴 কমেন্ট ব্লক খেয়েছে:\n👤 নাম: ${currentFb.name} | ফোন: ${currentFb.phone}`);
                }
            } else {
                await db.collection('fb_accounts').doc(currentFb.phone).update({ status: 'Dead' });
                await tg.sendMessage(ADMIN_ID, `🔴 আইডি লগআউট হয়ে গেছে:\n👤 নাম: ${currentFb.name} | ফোন: ${currentFb.phone}`);
            }
        } catch (e) { console.error(e.message); }
        finally { await browser.close(); }
    } catch (globalErr) { console.error(globalErr.message); }
    
    // ১ মিনিটে ৫টি আইডি রেট নিশ্চিত করতে ১২ সেকেন্ড ডিলে বাফার
    setTimeout(processComments, 12000); 
}

setTimeout(checkPendingLogins, 3000);
setTimeout(processComments, 5000);
