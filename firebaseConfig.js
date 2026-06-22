const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const base64Auth = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
        if (!base64Auth) {
            throw new Error("CRITICAL: FIREBASE_SERVICE_ACCOUNT_BASE64 is missing in Env!");
        }
        
        const decryptedJson = Buffer.from(base64Auth, 'base64').toString('utf-8');
        const serviceAccount = JSON.parse(decryptedJson);

        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("[Firebase] Infrastructure Synced Successfully.");
    } catch (error) {
        console.error("[Firebase Initialization Crash]:", error.message);
        process.exit(1);
    }
}

const db = admin.firestore();
module.exports = db;
