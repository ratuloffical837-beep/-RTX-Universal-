const firebaseConfig = {
  apiKey: "AIzaSyDFhx3WcKgytx1Saw9zfPq4dkblcoIeTBU",
  authDomain: "rtx-smm-pnayel.firebaseapp.com",
  projectId: "rtx-smm-pnayel",
  storageBucket: "rtx-smm-pnayel.firebasestorage.app",
  messagingSenderId: "790579613454",
  appId: "1:790579613454:web:e8e0e7d5ae8f570ad9915f"
};

let db = null;
const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user || {};
const userId = user.id ? user.id.toString() : 'Unknown';
const username = user.username || user.first_name || 'Guest';

try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
    }
} catch (e) {
    console.error("Firebase Error:", e);
}

document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor || '#1f1f1f');

function listenToUserBalance() {
    if (userId === 'Unknown' || !db) return;
    
    db.collection('users').doc(userId).onSnapshot(doc => {
        document.getElementById('balance').innerText = 
            doc.exists ? `৳ ${doc.data().balance || 0}` : "৳ 0.00";
    });
}

async function submitDeposit() {
    const amount = document.getElementById('depAmount').value.trim();
    const txid = document.getElementById('txid').value.trim();
    const btn = document.getElementById('depBtn');

    if (!amount || !txid || parseInt(amount) <= 0) {
        return alert('❌ সঠিক তথ্য দিন');
    }

    btn.disabled = true;
    btn.innerText = "সাবমিট হচ্ছে...";

    try {
        await db.collection('deposits').add({
            type: 'deposit',
            userId,
            username,
            amount: parseInt(amount),
            txid,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('✅ রিকোয়েস্ট সফল!');
        tg.sendData(JSON.stringify({ status: "success", type: "deposit" }));
    } catch (err) {
        alert('❌ ত্রুটি হয়েছে। আবার চেষ্টা করুন।');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerText = "ডিপোজিট রিকোয়েস্ট সাবমিট";
    }
}

function placeOrder() {
    const link = document.getElementById('postLink').value.trim();
    const count = parseInt(document.getElementById('commentCount').value);

    if (!link || count <= 0) return alert('❌ সঠিক লিংক ও সংখ্যা দিন');
    
    alert('🚀 অর্ডার প্রসেসিং...');
    // পরবর্তীতে API কল যোগ করা যাবে
}

function contactAdmin() {
    alert('📞 অ্যাডমিনের সাথে যোগাযোগ করুন');
}

window.addEventListener('DOMContentLoaded', listenToUserBalance);
