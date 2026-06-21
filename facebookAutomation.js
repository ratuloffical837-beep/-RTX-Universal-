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
    
    let browser = null;

    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage', 
                '--disable-blink-features=AutomationControlled',
                '--window-size=375,812'
            ]
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36');

        await page.goto('https://mbasic.facebook.com', { waitUntil: 'domcontentloaded', timeout: 50000 });
// বিকল্প সেলেক্টর চেক (mbasic মাঝে মাঝে ভিন্ন ডম স্ট্রাকচার দেয়)
const emailSelector = (await page.$('input[name="email"]')) ? 'input[name="email"]' : '#m_login_email';
const passSelector = (await page.$('input[name="pass"]')) ? 'input[name="pass"]' : '#m_login_password';
const loginBtnSelector = (await page.$('input[name="login"]')) ? 'input[name="login"]' : 'button[name="login"]';

await page.waitForSelector(emailSelector, { timeout: 15000 });
await page.type(emailSelector, account.phone, { delay: 100 });
await page.type(passSelector, account.password, { delay: 100 });
await page.click(loginBtnSelector);
        
        await Promise.all([
            page.click('input[name="login"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})
        ]);

        await new Promise(r => setTimeout(r, 5000)); 

        let isOTPPage = page.url().includes('checkpoint') || 
                        (await page.$('input[name="approvals_code"]')) !== null || 
                        (await page.$('input[name="code"]')) !== null;

        if (isOTPPage) {
            await tg.sendMessage(ADMIN_ID, `🚨 **ফেসবুক ওটিপি কোড প্রয়োজন!**\n\nআইডি: ${account.phone}\nআপনার ফোনে আসা কোডটি দেখে অ্যাডমিন বটে টাইপ করে পাঠান।`);
            await db.collection('fb_accounts').doc(account.phone).update({ status: 'WaitingOTP' });

            let otpSuccess = false;
            let maxRetries = 3; 
            let attemptCount = 0;
            let totalCycles = 18; // প্রারম্ভিক ৯০ সেকেন্ড (১৮ * ৫)

            // ওটিপি বাফার সাইকেল লুপ
            for (let i = 0; i < totalCycles; i++) {
                await new Promise(r => setTimeout(r, 5000));
                const checkDoc = await db.collection('fb_accounts').doc(account.phone).get();
                const currentStatus = checkDoc.data().status;
                
                if (currentStatus === 'SubmittingOTP') {
                    const code = checkDoc.data().otpCode;
                    const otpPageUrl = page.url(); // কারেন্ট ওটিপি ইউআরএল ব্যাকআপ
                    
                    let inputSelector = (await page.$('input[name="approvals_code"]')) ? 'input[name="approvals_code"]' : 'input[name="code"]';
                    
                    // যদি ফেসবুক mbasic এরর পেজে রিডাইরেক্ট করে দেয়, তবে পেজটি ওটিপি ইউআরএল-এ ব্যাক করানো হবে
                    if (!inputSelector) {
                        await page.goto(otpPageUrl, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
                        inputSelector = (await page.$('input[name="approvals_code"]')) ? 'input[name="approvals_code"]' : 'input[name="code"]';
                    }

                    if (!inputSelector) {
                        throw new Error("ফেসবুক ওটিপি পেজ নেভিগেশন ভেঙে গেছে।");
                    }

                    await page.waitForSelector(inputSelector, { timeout: 5000 });
                    
                    // এন্টারপ্রাইজ ইনপুট ক্লিয়ারিং ট্রিক (type="number" ও সেফ)
                    await page.$eval(inputSelector, el => el.value = ''); 
                    await page.type(inputSelector, code, { delay: 150 });
                    
                    const submitBtnSelector = (await page.$('input[type="submit"]')) ? 'input[type="submit"]' : 'button[type="submit"]';
                    
                    await Promise.all([
                        page.click(submitBtnSelector),
                        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 25000 }).catch(() => {})
                    ]);
                    
                    await new Promise(r => setTimeout(r, 5000));

                    const stillOnOTPPage = page.url().includes('checkpoint') || 
                                           (await page.$('input[name="approvals_code"]')) !== null || 
                                           (await page.content()).includes('incorrect') ||
                                           (await page.content()).includes('ভুল') ||
                                           (await page.content()).includes('Try Again');

                    if (!stillOnOTPPage) {
                        otpSuccess = true;
                        break; 
                    } else {
                        attemptCount++;
                        if (attemptCount >= maxRetries) {
                            await tg.sendMessage(ADMIN_ID, `⚠️ **সর্বোচ্চ ওটিপি লিমিট শেষ!**\n\nআইডি: ${account.phone}-এ পর পর ${maxRetries} বার ভুল ওটিপি দেওয়ার কারণে প্রসেস বাতিল করা হলো।`);
                            break;
                        }

                        // ফিক্স: লুপ ওভারফ্লো এড়াতে বোনাস সাইকেল মেকানিজম (আরও ১২ সাইকেল / ৬০ সেকেন্ড সময় বাড়ানো হলো)
                        totalCycles = Math.min(totalCycles + 12, 40); 
                        
                        await db.collection('fb_accounts').doc(account.phone).update({ 
                            status: 'WaitingOTP',
                            otpCode: ''
                        });
                        await tg.sendMessage(ADMIN_ID, `❌ **ভুল ওটিপি কোড! (প্রচেষ্টা: ${attemptCount}/${maxRetries})**\n\nআইডি: ${account.phone}-এর ওটিপি কোডটি সঠিক ছিল না। অনুগ্রহ করে পুনরায় সঠিক কোডটি পাঠান (নতুন কোড প্রসেস করার জন্য আপনি আরও ৬০ সেকেন্ড বোনাস টাইম পেলেন)।`);
                    }
                }
            }
            if (!otpSuccess) throw new Error("OTP Timeout/Verification Failed");
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
            await tg.sendMessage(ADMIN_ID, `✅ সফলভাবে ফেসবুক আইডি একটিভ হয়েছে: ${account.phone}`);
        } else {
            throw new Error("ভুল পাসওয়ার্ড অথবা অ্যাকাউন্টটি ফেসবুক ব্লক করেছে।");
        }
    } catch (err) {
        await db.collection('fb_accounts').doc(account.phone).update({ 
            status: 'Dead',
            otpCode: ''
        });
        await tg.sendMessage(ADMIN_ID, `❌ আইডি (${account.phone}) লগইন ব্যর্থ। কারণ: ${err.message}`);
    } finally {
        if (browser !== null) {
            await browser.close();
        }
        setTimeout(checkPendingLogins, 15000); 
    }
}

setTimeout(checkPendingLogins, 5000);
