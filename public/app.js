const firebaseConfig = {
  apiKey: "AIzaSyDFhx3WcKgytx1Saw9zfPq4dkblcoIeTBU",
  authDomain: "rtx-smm-pnayel.firebaseapp.com",
  projectId: "rtx-smm-pnayel",
  storageBucket: "rtx-smm-pnayel.firebasestorage.app",
  messagingSenderId: "790579613454",
  appId: "1:790579613454:web:e8e0e7d5ae8f570ad9915f"
};

let db = null;

try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
    } else {
        document.getElementById('balance').innerText = "SDK Error ❌";
    }
} catch (globalEngineError) {
    console.error("SDK Initialization Interrupted:", globalEngineError.message);
}

// মিনি অ্যাপ ইনিশিয়ালাইজেশন
// ১. টেলিগ্রাম ওয়েব অ্যাপ ইনিশিয়ালাইজেশন
const tg = window.Telegram.WebApp;
tg.expand(); 

// থিম কালার অনুযায়ী ফ্রন্টএন্ড সেটআপ
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor || '#1f1f1f');

const user = tg.initDataUnsafe?.user;
const userId = user ? user.id.toString() : 'Unknown';
const username = user ? (user.username || user.first_name) : 'Guest';

// ফায়ারবেস কনফিগারেশন (আপনার প্রজেক্ট আইডি ও ক্রেডেনশিয়ালস এখানে বসিয়ে নেবেন)
// যদি ফায়ারবেস অ্যাপ অলরেডি ইনিশিয়ালাইজড না থাকে তবেই নতুন করবে
if (!firebase.apps.length) {
    firebase.initializeApp({
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    });
}
const db = firebase.firestore();

// ২. রিয়েল-টাইম ব্যালেন্স লোড করার মেকানিজম (যা লোডিং স্ক্রিন ফিক্স করবে)
function listenToUserBalance() {
    if (userId === 'Unknown') {
        document.getElementById('balance').innerText = "৳ 0.00";
        return;
    }

    db.collection('users').doc(userId).onSnapshot((doc) => {
        if (doc.exists && doc.data().balance !== undefined) {
            document.getElementById('balance').innerText = `৳ ${doc.data().balance}`;
        } else {
            document.getElementById('balance').innerText = "৳ 0.00";
        }
    }, (error) => {
        console.error("Firebase balance error:", error);
        document.getElementById('balance').innerText = "৳ ত্রুটি";
    });
}

// অ্যাপ ওপেন হওয়ার সাথে সাথে ব্যালেন্স লিসেনার চালু হবে
window.addEventListener('DOMContentLoaded', () => {
    listenToUserBalance();
});

// ৩. ম্যানুয়াল ডিপোজিট হ্যান্ডলার (ইনলাইন বাটন ক্র্যাশ প্রোটেকশন সহ)
async function submitDeposit() {
    const amountInput = document.getElementById('depAmount');
    const txidInput = document.getElementById('txid');
    const depBtn = document.getElementById('depBtn');

    if (!amountInput || !txidInput || !depBtn) {
        alert('❌ ডম এলিমেন্ট ত্রুটি! অ্যাপটি আবার লোড করুন।');
        return;
    }

    const amount = amountInput.value;
    const txid = txidInput.value.trim();

    if (!amount || !txid || parseInt(amount) <= 0) {
        alert('❌ দয়া করে সঠিক টাকার পরিমাণ এবং ট্রানজেকশন আইডি প্রদান করুন।');
        return;
    }

    // বাটন লক ও ভিজ্যুয়াল ফিডব্যাক
    depBtn.disabled = true;
    depBtn.innerText = "সাবমিট হচ্ছে...";

    const depositData = {
        type: 'deposit',
        userId: userId,
        username: username,
        amount: parseInt(amount),
        txid: txid,
        status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        // ব্যাকএন্ডে ডেটাবেজে সরাসরি পুশ (যদি tg.sendData ব্লক হয়ে যায় তার সেফটি নেট)
        await db.collection('deposits').add(depositData);
        
        alert('✅ ডিপোজিট রিকোয়েস্ট সফলভাবে ব্যাকএন্ডে জমা হয়েছে!');
        
        // টেলিগ্রাম নেটিভ ক্লোজিং ট্রাই
        if (tg.sendData) {
            try {
                tg.sendData(JSON.stringify({ status: "success", type: "deposit" }));
            } catch (tgError) {
                console.log("Inline button context detected. Using closeWebApp instead.");
                tg.close();
            }
        } else {
            tg.close();
        }
    } catch (error) {
        console.error("Submission failed:", error);
        alert('❌ সাবমিশন ব্যর্থ হয়েছে! আবার চেষ্টা করুন।');
        depBtn.disabled = false;
        depBtn.innerText = "ডিপোজিট রিকোয়েস্ট সাবমিট";
    }
}

// কমেন্ট অর্ডার ফাংশন
function placeOrder() {
    const postLink = document.getElementById('postLink')?.value;
    const commentCount = document.getElementById('commentCount')?.value;
    const orderBtn = document.getElementById('orderBtn');

    if (!postLink || !commentCount || commentCount <= 0) {
        alert('❌ সঠিক লিংক এবং কমেন্ট সংখ্যা লিখুন।');
        return;
    }

    alert('🚀 অর্ডার প্রসেস করা হচ্ছে...');
}
