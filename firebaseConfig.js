const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const base64Auth = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
        if (!base64Auth) throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 missing!");

        const decrypted = Buffer.from(base64Auth, 'base64').toString('utf-8');
        const serviceAccount = JSON.parse(decrypted);
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log("✅ Firebase Initialized");
    } catch (error) {
        console.error("Firebase Init Failed:", error.message);
        process.exit(1);
    }
}

module.exports = admin.firestore();
