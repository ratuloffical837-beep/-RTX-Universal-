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

const tg = window.Telegram.WebApp;
tg.expand();

const userId = tg.initDataUnsafe?.user?.id ? tg.initDataUnsafe.user.id.toString() : "123456789"; 
const username = tg.initDataUnsafe?.user?.first_name || "Guest User";

function listenToUserBalance() {
    if (!db) {
        document.getElementById('balance').innerText = "Offline ⚠️";
        return;
    }
    
    db.collection('users').doc(userId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('balance').innerText = `${parseFloat(data.balance || 0).toFixed(2)} ৳`;
        } else {
            document.getElementById('balance').innerText = "0.00 ৳";
        }
    }, (err) => {
        document.getElementById('balance').innerText = "Connection Drop";
    });
}

function submitDeposit() {
    const amount = document.getElementById('depAmount').value;
    const txid = document.getElementById('txid').value;

    if (!amount || !txid || amount <= 0) {
        alert('❌ দয়া করে সঠিক তথ্য এবং পরিমাণ পূরণ করুন।');
        return;
    }

    const data = {
        type: 'deposit',
        userId: userId,
        username: username,
        amount: amount,
        txid: txid
    };

    // ফিক্স ৩: নেটওয়ার্ক পে-লোড ড্রপ এড়াতে টেলিগ্রাম উইন্ডো ক্লোজের পূর্বে ১.৫ সেকেন্ডের সেফটি বাফার ডিলে
    tg.sendData(JSON.stringify(data));
    setTimeout(() => {
        tg.close();
    }, 1500);
}

async function placeOrder() {
    const link = document.getElementById('postLink').value;
    const targetComments = document.getElementById('commentCount').value;
    const orderBtn = document.getElementById('orderBtn');

    if (!link || !targetComments || targetComments <= 0) {
        alert('❌ দয়া করে সঠিক লিংক এবং কমেন্ট সংখ্যা প্রদান করুন!');
        return;
    }

    orderBtn.disabled = true;
    orderBtn.innerText = "প্রসেস করা হচ্ছে...";

    try {
        const targetHost = window.location.origin; 
        const response = await fetch(`${targetHost}/api/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                link: link,
                targetComments: targetComments
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "অর্ডার সাবমিট ব্যর্থ হয়েছে!");
        }

        alert('🎉 অর্ডার সফলভাবে গ্রহণ করা হয়েছে! ৫ মিনিটের মধ্যে অটোমেশন কাজ শুরু করবে।');
        document.getElementById('postLink').value = "";
        document.getElementById('commentCount').value = "";

    } catch (error) {
        alert(error.message);
    } finally {
        orderBtn.disabled = false;
        orderBtn.innerText = "অর্ডার কনফার্ম করুন";
    }
}

function contactAdmin() {
    tg.openTelegramLink('https://t.me/Ratul');
}

window.onload = function() {
    listenToUserBalance();
};
