const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const db = require('./firebaseConfig.js');
const { Telegram } = require('telegraf');

const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);
const tg = new Telegram(process.env.ADMIN_BOT_TOKEN);

async function checkPendingLogins() {
    let snapshot;
    try {
        snapshot = await db.collection('fb_accounts').where('status', '==', 'PendingLogin').limit(1).get();
    } catch (e) {
        setTimeout(checkPendingLogins, 15000);
        return;
    }

    if (snapshot.empty) {
        setTimeout(checkPendingLogins, 15000);
        return;
    }

    const doc = snapshot.docs[0];
    const account = doc.data();
    
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');

    try {
        await page.goto('https://mbasic.facebook.com', { waitUntil: 'networkidle2', timeout: 45000 });
        await page.waitForSelector('input[name="email"]', { timeout: 10000 });
        await page.type('input[name="email"]', account.phone);
        await page.type('input[name="pass"]', account.password);
        
        await Promise.all([
            page.click('input[name="login"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})
        ]);

        const isOTPPage = page.url().includes('checkpoint') || 
                          (await page.$('input[name="approvals_code"]')) !== null || 
                          (await page.$('input[name="code"]')) !== null;

        if (isOTPPage) {
            await tg.sendMessage(ADMIN_ID, `⚠️ **OTP Required!**\n\nআইডি: ${account.phone}\nকোডটি ৯০ সেকেন্ডের মধ্যে অ্যাডমিন বটে টাইপ করে পাঠান।`);
            await db.collection('fb_accounts').doc(account.phone).update({ status: 'WaitingOTP' });

            let otpSuccess = false;
            for (let i = 0; i < 18; i++) {
                await new Promise(r => setTimeout(r, 5000));
                const checkDoc = await db.collection('fb_accounts').doc(account.phone).get();
                
                if (checkDoc.data().status === 'SubmittingOTP') {
                    const code = checkDoc.data().otpCode;
                    
                    const inputSelector = (await page.$('input[name="approvals_code"]')) ? 'input[name="approvals_code"]' : 'input[name="code"]';
                    await page.waitForSelector(inputSelector, { timeout: 5000 });
                    await page.type(inputSelector, code);
                    
                    const submitBtnSelector = (await page.$('input[type="submit"]')) ? 'input[type="submit"]' : 'button[type="submit"]';
                    
                    // ফিক্স ১: ওটিপি কোড সাবমিশনের পর রিডাইরেকশন হ্যান্ডলার
                    await Promise.all([
                        page.click(submitBtnSelector),
                        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 25000 }).catch(() => {})
                    ]);
                    
                    // ফেসবুক মেকানিজমের ইন্টারনাল টোকেন জেনারেশনের জন্য অতিরিক্ত ৫ সেকেন্ড সেফটি ডিলে বাফার
                    await new Promise(r => setTimeout(r, 5000));
                    
                    otpSuccess = true;
                    break;
                }
            }
            if (!otpSuccess) throw new Error("OTP Timeout Error");
        }

        const loginSuccess = (await page.$('input[name="fb_dtsg"]')) !== null || 
                             (await page.$('a[href*="logout"]')) !== null || 
                             !page.url().includes('login');

        if (loginSuccess) {
            const cookies = await page.cookies();
            await db.collection('fb_accounts').doc(account.phone).update({
                cookies: JSON.stringify(cookies),
                status: 'Active',
                otpCode: ''
            });
            await tg.sendMessage(ADMIN_ID, `✅ সফলভাবে ফেসবুক আইডি যুক্ত হয়েছে: ${account.phone}`);
        } else {
            throw new Error("Invalid Credentials/Redirect Interrupted");
        }
    } catch (err) {
        // ফিক্স ২: ফেইলড সেশনে অ্যাকাউন্ট ডেড করার পাশাপাশি ওটিপি কোড ফ্ল্যাশ (Clear) করা হলো
        await db.collection('fb_accounts').doc(account.phone).update({ 
            status: 'Dead',
            otpCode: ''
        });
        await tg.sendMessage(ADMIN_ID, `❌ আইডি (${account.phone}) লগইন ব্যর্থ হয়েছে। ওটিপি ফ্লাশড।`);
    } finally {
        await browser.close();
        setTimeout(checkPendingLogins, 15000);
    }
}

async function processComments() {
    try {
        const orderSnapshot = await db.collection('orders').where('status', '==', 'Processing').limit(1).get();
        if (orderSnapshot.empty) {
            setTimeout(processComments, 60000);
            return;
        }

        const orderDoc = orderSnapshot.docs[0];
        const orderData = orderDoc.data();

        if (orderData.commentsDone >= orderData.targetComments) {
            await orderDoc.ref.update({ status: 'Completed' });
            setTimeout(processComments, 5000);
            return;
        }

        const fbSnapshot = await db.collection('fb_accounts').where('status', '==', 'Active').get();
        if (fbSnapshot.empty) {
            setTimeout(processComments, 30000);
            return;
        }
        const randomFb = fbSnapshot.docs[Math.floor(Math.random() * fbSnapshot.docs.length)].data();

        const commentSnapshot = await db.collection('comment_bank').get();
        if (commentSnapshot.empty) {
            setTimeout(processComments, 30000);
            return;
        }
        const randomComment = commentSnapshot.docs[Math.floor(Math.random() * commentSnapshot.docs.length)].data().text;

        let parsedCookies;
        try {
            if (!randomFb.cookies || randomFb.cookies.trim() === "") throw new Error("Empty cookies");
            parsedCookies = JSON.parse(randomFb.cookies);
        } catch (cookieErr) {
            await db.collection('fb_accounts').doc(randomFb.phone).update({ status: 'Dead', otpCode: '' });
            setTimeout(processComments, 5000);
            return;
        }

        const browser = await puppeteer.launch({ 
            headless: true, 
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: ['--no-sandbox', '--disable-dev-shm-usage'] 
        });
        const page = await browser.newPage();

        try {
            await page.setCookie(...parsedCookies);
            let targetUrl = orderData.link.replace('www.facebook.com', 'mbasic.facebook.com');
            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });

            const hasTextArea = await page.waitForSelector('textarea[name="comment_text"]', { timeout: 8000 }).catch(() => null);

            if (hasTextArea) {
                await page.type('textarea[name="comment_text"]', randomComment);
                const submitSelector = (await page.$('input[name="submit"]')) ? 'input[name="submit"]' : 'input[type="submit"]';
                
                await Promise.all([
                    page.click(submitSelector),
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
                ]);

                const pageContent = await page.content();
                const isBlocked = pageContent.includes('temporarily blocked') || 
                                  pageContent.includes('action is blocked') || 
                                  (await page.$('textarea[name="comment_text"]')) !== null;

                if (!isBlocked) {
                    await orderDoc.ref.update({ commentsDone: orderData.commentsDone + 1 });
                    console.log(`[Worker System] Comment executed successfully via ${randomFb.phone}`);
                } else {
                    await db.collection('fb_accounts').doc(randomFb.phone).update({ status: 'Dead', otpCode: '' });
                    await tg.sendMessage(ADMIN_ID, `🔴 ফেসবুক অ্যাকাউন্ট কমেন্ট ব্লক খেয়েছে: ${randomFb.phone}`);
                }
            } else {
                await db.collection('fb_accounts').doc(randomFb.phone).update({ status: 'Dead', otpCode: '' });
                await tg.sendMessage(ADMIN_ID, `🔴 ফেসবুক সেশন ডেড/লগআউট হয়েছে: ${randomFb.phone}`);
            }
        } catch (workerErr) {
            console.error("[Worker Core Exception]", workerErr.message);
        } finally {
            await browser.close();
        }
    } catch (globalErr) {
        console.error("[Global System Exception]", globalErr.message);
    }
    
    // ফিক্স ৪: হোস্টিং মেমোরি স্থিতিশীল রাখতে এবং প্যারালাল ওভারল্যাপ এড়াতে লুপ সাইকেল সেফ ৬০ সেকেন্ড করা হলো
    setTimeout(processComments, 60000); 
}

setTimeout(checkPendingLogins, 5000);
setTimeout(processComments, 10000);
