const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const db = require('./firebaseConfig.js');
const { Telegram } = require('telegraf');
const tg = new Telegram(process.env.ADMIN_BOT_TOKEN);
const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);

async function checkPendingLogins() {
    const snapshot = await db.collection('fb_accounts').where('status', '==', 'PendingLogin').limit(1).get();
    if (snapshot.empty) return setTimeout(checkPendingLogins, 15000);

    const doc = snapshot.docs[0];
    const account = doc.data();
    let browser = null;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36');
        await page.goto('https://mbasic.facebook.com', { waitUntil: 'networkidle2' });

        // Improved Selectors
        await page.type('input[name="email"]', account.phone, { delay: 100 });
        await page.type('input[name="pass"]', account.password, { delay: 100 });

        await Promise.all([
            page.click('input[name="login"], button[type="submit"]'),
            page.waitForNavigation({ timeout: 30000 }).catch(() => {})
        ]);

        // OTP Handling (improved)
        const isOTP = page.url().includes('checkpoint') || await page.$('input[name="approvals_code"], input[name="code"]');
        if (isOTP) {
            // OTP logic same as before (improved version available if needed)
            await db.collection('fb_accounts').doc(account.phone).update({ status: 'WaitingOTP' });
            await tg.sendMessage(ADMIN_ID, `🚨 OTP দরকার!\nআইডি: ${account.phone}`);
        } else {
            const cookies = await page.cookies();
            await db.collection('fb_accounts').doc(account.phone).update({
                cookies: JSON.stringify(cookies),
                status: 'Active'
            });
            await tg.sendMessage(ADMIN_ID, `✅ লগইন সফল: ${account.phone}`);
        }
    } catch (err) {
        await db.collection('fb_accounts').doc(account.phone).update({ status: 'Dead' });
        await tg.sendMessage(ADMIN_ID, `❌ লগইন ফেল: ${account.phone}`);
    } finally {
        if (browser) await browser.close();
        setTimeout(checkPendingLogins, 15000);
    }
}

setTimeout(checkPendingLogins, 5000);
