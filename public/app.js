const firebaseConfig = {
  apiKey: "AIzaSyDFhx3WcKgytx1Saw9zfPq4dkblcoIeTBU",
  authDomain: "rtx-smm-pnayel.firebaseapp.com",
  projectId: "rtx-smm-pnayel",
  storageBucket: "rtx-smm-pnayel.firebasestorage.app",
  messagingSenderId: "790579613454",
  appId: "1:790579613454:web:e8e0e7d5ae8f570ad9915f"
};

let db = null;

// গ্লোবাল ফাংশন যা ফায়ারবেস লোড নিশ্চিত করবে
function initFirebaseAndUI() {
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            listenToUserBalance();
        } else {
            // যদি ওল্ড সিডিএন লোড হতে লেট হয়, ১ সেকেন্ড পর আবার ট্রাই করবে
            setTimeout(initFirebaseAndUI, 1000);
        }
    } catch (e) { 
        console.error("Firebase Initialization Retrying...", e.message); 
        setTimeout(initFirebaseAndUI, 1000);
    }
}

const tg = window.Telegram.WebApp;
tg.expand();

const userId = tg.initDataUnsafe?.user?.id ? tg.initDataUnsafe.user.id.toString() : "123456789"; 
const username = tg.initDataUnsafe?.user?.first_name || "ROOT_USER";
const avatarUrl = tg.initDataUnsafe?.user?.photo_url || "https://www.w3schools.com/howto/img_avatar.png";

document.getElementById('userName').innerText = `${username.toUpperCase()}@SYS`;
document.getElementById('userAvatar').src = avatarUrl;

function listenToUserBalance() {
    if (!db) return;
    db.collection('users').doc(userId).onSnapshot((doc) => {
        if (doc.exists) {
            document.getElementById('balance').innerText = `${parseFloat(doc.data().balance || 0).toFixed(2)} BDT`;
        } else {
            document.getElementById('balance').innerText = "0.00 BDT";
        }
    }, () => {
        document.getElementById('balance').innerText = "OFFLINE ⚠️";
    });
}

function toggleSection(id) {
    document.getElementById(id).classList.toggle('hidden');
}

function submitDeposit() {
    const amount = document.getElementById('depAmount').value;
    const userPhone = document.getElementById('userPhone').value;
    const txid = document.getElementById('txid').value;
    const depBtn = document.getElementById('depBtn');

    if (!db) {
        alert('❌ ডাটাবেজ কানেকশন এখনও তৈরি হয়নি! ২ সেকেন্ড পর আবার চেষ্টা করুন।');
        return;
    }

    if (!amount || !txid || !userPhone || amount <= 0) {
        alert('❌ দয়া করে সঠিক ট্রানজেকশন ডাটা ইনপুট দিন!');
        return;
    }

    depBtn.disabled = true;
    depBtn.innerText = "TRANSMITTING DATA...";

    db.collection('deposits').add({
        userId: userId,
        username: username,
        userPhone: userPhone.trim(),
        amount: parseInt(amount),
        txid: txid.trim(),
        status: 'pending',
        createdAt: new Date()
    }).then(() => {
        alert('📡 ডিপোজিট ডাটা সাবমিট সফল। ৫ মিনিট থেকে ১ ঘন্টা ওয়েট করুন।');
        // কোনো হার্ডকোডেড setTimeout ছাড়াই প্রমিজ রেজোলিউশনের ভেতরেই সেফ ক্লোজিং
        tg.close(); 
    }).catch(err => {
        alert('Error: ' + err.message);
        depBtn.disabled = false;
        depBtn.innerText = "SUBMIT TRANSACTION";
    });
}

async function placeOrder() {
    const link = document.getElementById('postLink').value;
    const targetComments = document.getElementById('commentCount').value;
    const orderBtn = document.getElementById('orderBtn');

    if (!link || !targetComments || targetComments <= 0) {
        alert('❌ ডাটা ইনপুট মিসিং!');
        return;
    }

    orderBtn.disabled = true;
    orderBtn.innerText = "OVERRIDING INJECTOR...";

    try {
        const response = await fetch(`${window.location.origin}/api/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, link, targetComments })
        });
        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "অর্ডার ফেইলড!");
        alert('🎉 অর্ডার গৃহীত হয়েছে! অটোমেশন ইঞ্জিন ৫ মিনিটে লাইভ হবে।');
        tg.close();
    } catch (error) {
        alert(error.message);
        orderBtn.disabled = false;
        orderBtn.innerText = "CONFIRM EXPLOIT ORDER";
    }
}

function contactAdmin() { tg.openTelegramLink('https://t.me/Ratul'); }
window.onload = initFirebaseAndUI;
