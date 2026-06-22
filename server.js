const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const db = require('./firebaseConfig.js');

// অটোমেশন স্ক্রিপ্ট ও বট ইঞ্জিন রানিং
require('./adminBot.js');
require('./userBot.js');
require('./facebookAutomation.js');

// অর্ডার প্লেস করার API
app.post('/api/order', async (req, res) => {
    try {
        const { userId, link, targetComments } = req.body;
        if (!userId || !link || !targetComments) {
            return res.status(400).json({ error: "সবগুলো ফিল্ড পূরণ করা বাধ্যতামূলক!" });
        }

        const parsedComments = parseInt(targetComments);
        if (parsedComments <= 0) return res.status(400).json({ error: "ভুল কমেন্ট সংখ্যা!" });

        const userRef = db.collection('users').doc(userId.toString());
        
        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error("ইউজার অ্যাকাউন্ট ডাটাবেজে নেই! প্রথমে বটে /start দিন।");

            const currentBalance = userDoc.data().balance || 0;
            const costPerComment = 2; // ১ কমেন্ট = ২ টাকা (পয়েন্ট)
            const totalCost = parsedComments * costPerComment;

            if (currentBalance < totalCost) {
                throw new Error("❌ আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স (পয়েন্ট) নেই!");
            }

            transaction.update(userRef, { balance: currentBalance - totalCost });

            const orderRef = db.collection('orders').doc();
            transaction.set(orderRef, {
                userId: userId.toString(),
                link: link.trim(),
                targetComments: parsedComments,
                commentsDone: 0,
                status: "Processing",
                createdAt: new Date()
            });

            return { success: true, newBalance: currentBalance - totalCost };
        });

        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/health', (req, res) => res.status(200).send('OK'));

app.listen(PORT, () => {
    console.log(`[Server] Live on port ${PORT}`);
});
