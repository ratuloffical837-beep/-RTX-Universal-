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
const tg = window.Telegram.WebApp;
tg.expand(); 

const user = tg.initDataUnsafe?.user;
const userId = user ? user.id : 'Unknown';
const username = user ? (user.username || user.first_name) : 'Guest';

function submitDeposit() {
    const amountInput = document.getElementById('depAmount');
    const txidInput = document.getElementById('txid');
    const depBtn = document.getElementById('depBtn');

    // ডিফেনসিভ প্রোগ্রামিং: কোনো কারণে ডম এলিমেন্ট না পাওয়া গেলে ফাংশন সেফলি রিটার্ন করবে
    if (!amountInput || !txidInput || !depBtn) {
        alert('❌ ফ্রন্টএন্ড ইন্টারফেস ত্রুটি! অনুগ্রহ করে অ্যাপটি পুনরায় ওপেন করুন।');
        return;
    }

    const amount = amountInput.value;
    const txid = txidInput.value.trim();

    if (!amount || !txid || amount <= 0) {
        alert('❌ দয়া করে সঠিক টাকার পরিমাণ এবং ট্রানজেকশন আইডি প্রদান করুন।');
        return;
    }

    const data = {
        type: 'deposit',
        userId: userId,
        username: username,
        amount: parseInt(amount),
        txid: txid
    };

    try {
        // ফ্রেম ড্রপ এবং মাল্টি-ক্লিক প্রোটেকশন লক
        depBtn.disabled = true;
        depBtn.innerText = "সাবমিট হচ্ছে...";

        // টেলিগ্রাম নেটিভ ডেটা ট্রান্সফার এক্সিকিউশন
        tg.sendData(JSON.stringify(data));
    } catch (error) {
        // এরর হলে বাটন পুনরায় সচল করার মেকানিজম
        depBtn.disabled = false;
        depBtn.innerText = "ডিপোজিট রিকোয়েস্ট সাবমিট";
        alert('❌ মিনি অ্যাপ থেকে ডেটা ট্রান্সফার ব্যর্থ হয়েছে: ' + error.message);
    }
}

// আপনার অ্যাপের অন্যান্য গ্লোবাল ফাংশনাবিলিটি (অপরিবর্তিত)
function contactAdmin() {
    tg.openTelegramLink('https://t.me/YourAdminUsername'); 
}
