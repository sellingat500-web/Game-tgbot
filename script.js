const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user;
let balance = parseFloat(localStorage.getItem('balance')) || 0.000;
let history = JSON.parse(localStorage.getItem('history')) || [];

// Bot & Admin Config
const ADMIN_ID = "8300015294";
const BOT_TOKEN = "8896244741:AAFLkaS7py9wY7ToUMbcd3TpwWSETkoPlEE";
const UPI_ID = "8075940486@omni";

// Spin Time Tracker
let lastSpinTime = parseInt(localStorage.getItem('lastSpinTime')) || 0;
let bonusSpins = parseInt(localStorage.getItem('bonusSpins')) || 0;

function updateUI() {
    document.getElementById('user-balance').innerText = balance.toFixed(3);
    document.getElementById('wallet-balance').innerText = balance.toFixed(3);
    
    // Max withdraw calculation (Maintain min 0.5 TON)
    let maxWithdraw = Math.max(0, balance - 0.5);
    document.getElementById('max-withdraw-val').innerText = `${maxWithdraw.toFixed(3)} TON`;

    if(user) {
        document.getElementById('profile-name').innerText = user.first_name;
        document.getElementById('profile-id').innerText = user.id;
        if(user.photo_url) document.getElementById('profile-dp').src = user.photo_url;
    }

    checkSpinCooldown();
}

// 24 Hours Cooldown Logic for Wheel
function checkSpinCooldown() {
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours in ms
    const badge = document.getElementById('spin-status-badge');
    const spinBtn = document.getElementById('spin-button');

    if (now - lastSpinTime >= cooldown) {
        badge.innerText = "Daily Spin: Available!";
        badge.style.color = "#10b981";
        badge.style.borderColor = "#10b981";
        spinBtn.innerText = "SPIN NOW";
        spinBtn.disabled = false;
    } else if (bonusSpins > 0) {
        badge.innerText = `Bonus Spins Left: ${bonusSpins}`;
        badge.style.color = "#0088cc";
        badge.style.borderColor = "#0088cc";
        spinBtn.innerText = "SPIN (BONUS)";
        spinBtn.disabled = false;
    } else {
        const diff = cooldown - (now - lastSpinTime);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        badge.innerText = `Next Spin in: ${hours}h ${minutes}m`;
        badge.style.color = "#ef4444";
        badge.style.borderColor = "#ef4444";
        spinBtn.innerText = "COOLDOWN ACTIVE";
    }
}

// Page Navigation
function switchPage(pageId) {
    tg.HapticFeedback.impactOccurred('light');
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(`page-${pageId}`).style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${pageId}`).classList.add('active');

    if(pageId === 'history') renderHistory();
    if(pageId === 'wheel') checkSpinCooldown();
}

// Wallet Sub-tabs (Deposit / Withdraw)
function switchWalletTab(type) {
    tg.HapticFeedback.impactOccurred('light');
    document.getElementById('deposit-box').style.display = type === 'deposit' ? 'block' : 'none';
    document.getElementById('withdraw-box').style.display = type === 'withdraw' ? 'block' : 'none';
    
    document.getElementById('tab-dep-btn').classList.toggle('active', type === 'deposit');
    document.getElementById('tab-with-btn').classList.toggle('active', type === 'withdraw');
}

// DEPOSIT PROCESS
function generateDepositQR() {
    const amt = document.getElementById('dep-amount').value;
    if(!amt || amt < 50) {
        tg.showAlert("Minimum deposit amount is ₹50");
        return;
    }
    const upiString = `upi://pay?pa=${UPI_ID}&pn=Rarism&am=${amt}&cu=INR`;
    document.getElementById('upi-qr-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
    document.getElementById('qr-amount-text').innerText = `₹${amt}`;
    document.getElementById('qr-section').style.display = 'block';
}

function confirmDepositSent() {
    const amt = document.getElementById('dep-amount').value;
    const userName = user ? user.first_name : "Guest";
    const userId = user ? user.id : "0000";

    const msg = `📥 *NEW DEPOSIT REQUEST*\n\n👤 *User:* ${userName}\n🆔 *User ID:* ${userId}\n💰 *Amount:* ₹${amt}\n\nPlease check bank statement & credit balance.`;
    
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${ADMIN_ID}&text=${encodeURIComponent(msg)}&parse_mode=Markdown`)
        .then(() => {
            tg.showAlert("✅ Deposit Request Sent to Admin!");
            document.getElementById('qr-section').style.display = 'none';
            document.getElementById('dep-amount').value = '';
        });
}

// WITHDRAWAL PROCESS (With 0.5 TON Min Balance Protection)
function processWithdrawal() {
    const upi = document.getElementById('with-upi').value.trim();
    const amt = parseFloat(document.getElementById('with-amount').value);
    const maxWithdraw = balance - 0.5;

    if(!upi || !upi.includes('@')) {
        tg.showAlert("Please enter a valid UPI ID (e.g. name@upi)");
        return;
    }
    if(!amt || amt <= 0) {
        tg.showAlert("Please enter a valid withdrawal amount");
        return;
    }
    if(amt > maxWithdraw) {
        tg.showAlert(`Insufficient Withdrawable Balance!\n\nYou must maintain a minimum 0.5 TON balance.\nMaximum allowed withdrawal: ${Math.max(0, maxWithdraw).toFixed(3)} TON`);
        return;
    }

    // Deduct Balance Immediately
    balance -= amt;
    localStorage.setItem('balance', balance);
    addHistory("Withdrawal", `To ${upi}`, amt, 'loss');
    updateUI();

    // Telegram Bot Notification to Admin
    const userName = user ? user.first_name : "Guest";
    const userId = user ? user.id : "0000";

    const msg = `💸 *NEW WITHDRAWAL REQUEST*\n\n👤 *User:* ${userName}\n🆔 *User ID:* ${userId}\n🏦 *UPI ID:* \`${upi}\`\n💰 *Amount:* ${amt} TON\n\nPlease transfer funds to user UPI.`;

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${ADMIN_ID}&text=${encodeURIComponent(msg)}&parse_mode=Markdown`)
        .then(() => {
            tg.showAlert(`✅ Withdrawal Request Submitted!\n\n${amt} TON deducted. Admin will credit funds to ${upi} shortly.`);
            document.getElementById('with-upi').value = '';
            document.getElementById('with-amount').value = '';
        });
}

// WHEEL LOGIC (24H Protected)
const slices = [
    { label: "0.001 TON", val: 0.001, prob: 70, color: "#1e2942" },
    { label: "0.01 TON",  val: 0.01,  prob: 5,  color: "#0088cc" },
    { label: "0.1 TON",   val: 0.1,   prob: 1,  color: "#1e2942" },
    { label: "0.01 TON",  val: 0.01,  prob: 5,  color: "#0088cc" },
    { label: "0.5 TON",   val: 0.5,   prob: 0.5,color: "#1e2942" },
    { label: "0.01 TON",  val: 0.01,  prob: 5,  color: "#0088cc" },
    { label: "1.0 TON",   val: 1.0,   prob: 0.2,color: "#f59e0b" },
    { label: "0.01 TON",  val: 0.01,  prob: 5,  color: "#0088cc" },
    { label: "0.1 TON",   val: 0.1,   prob: 1,  color: "#1e2942" },
    { label: "0.5 TON",   val: 0.5,   prob: 0.5,color: "#0088cc" },
    { label: "0.01 TON",  val: 0.01,  prob: 5,  color: "#1e2942" },
    { label: "0.1 TON",   val: 0.1,   prob: 1,  color: "#0088cc" },
    { label: "2.0 TON",   val: 2.0,   prob: 0.1,color: "#ef4444" }
];

const totalSlices = slices.length;
const sliceAngle = 360 / totalSlices;

function buildCleanWheel() {
    const board = document.getElementById('wheel-board');
    board.innerHTML = '';
    let gradientStops = [];
    slices.forEach((slice, i) => {
        gradientStops.push(`${slice.color} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`);
    });
    board.style.background = `conic-gradient(${gradientStops.join(', ')})`;

    slices.forEach((slice, i) => {
        const textDiv = document.createElement('div');
        textDiv.className = 'wheel-slice-text';
        let centerAngle = (i * sliceAngle) + (sliceAngle / 2);
        textDiv.style.transform = `rotate(${centerAngle}deg) translateY(-105px) rotate(90deg)`;
        textDiv.innerText = slice.label;
        board.appendChild(textDiv);
    });
}

let isSpinning = false;
let currentDeg = 0;

function spinWheel() {
    if (isSpinning) return;

    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    
    // Check spin eligibility
    if (now - lastSpinTime < cooldown && bonusSpins <= 0) {
        tg.showAlert("Cooldown Active! Please wait for 24 hours or refer friends to get bonus spins.");
        return;
    }

    isSpinning = true;

    // Deduct bonus spin if available, else update lastSpinTime
    if (bonusSpins > 0) {
        bonusSpins--;
        localStorage.setItem('bonusSpins', bonusSpins);
    } else {
        lastSpinTime = now;
        localStorage.setItem('lastSpinTime', lastSpinTime);
    }

    updateUI();
    tg.HapticFeedback.impactOccurred('medium');

    // Rigged Outcome Selection (70% chance for 0.001 TON)
    let rand = Math.random() * 100;
    let sum = 0, winningIndex = 0;
    for (let i = 0; i < slices.length; i++) {
        sum += slices[i].prob;
        if (rand <= sum) { winningIndex = i; break; }
    }

    const spins = 5;
    const targetSliceAngle = (winningIndex * sliceAngle) + (sliceAngle / 2);
    const finalDegree = currentDeg + (360 * spins) + (360 - targetSliceAngle);

    document.getElementById('wheel-board').style.transform = `rotate(${finalDegree}deg)`;
    currentDeg = finalDegree;

    setTimeout(() => {
        let wonVal = slices[winningIndex].val;
        balance += wonVal;
        localStorage.setItem('balance', balance);
        
        addHistory("Lucky Wheel", `Won ${wonVal} TON`, wonVal, 'win');
        
        document.getElementById('win-amount-text').innerText = `${wonVal} TON`;
        document.getElementById('win-modal').style.display = 'flex';
        
        tg.HapticFeedback.notificationOccurred('success');
        updateUI();
        isSpinning = false;
    }, 4000);
}

function closeWinModal() { document.getElementById('win-modal').style.display = 'none'; }

function addHistory(game, detail, amount, type) {
    history.unshift({ game, detail, amount, type, time: new Date().toLocaleTimeString() });
    if(history.length > 15) history.pop();
    localStorage.setItem('history', JSON.stringify(history));
}

function renderHistory() {
    const container = document.getElementById('history-container');
    container.innerHTML = history.length === 0 ? "<p style='color:#64748b; text-align:center;'>No activity yet.</p>" : "";
    history.forEach(item => {
        let isWin = item.type === 'win';
        container.innerHTML += `
            <div class="history-item">
                <div><strong>${item.game}</strong><br><small style="color:#64748b">${item.detail} (${item.time})</small></div>
                <div class="${isWin ? 'hist-win' : 'hist-loss'}">${isWin ? '+' : '-'}${item.amount} TON</div>
            </div>
        `;
    });
}

function copyRefLink() {
    let userId = user ? user.id : '000';
    let link = `https://t.me/YourBotName?start=${userId}`;
    
    // Simulate Bonus Spin Addition on Referral Share
    bonusSpins++;
    localStorage.setItem('bonusSpins', bonusSpins);
    updateUI();

    tg.showAlert(`Referral link generated:\n${link}\n\n1 Bonus spin added!`);
}

buildCleanWheel();
updateUI();
// Auto update timer every 1 min
setInterval(checkSpinCooldown, 60000);
