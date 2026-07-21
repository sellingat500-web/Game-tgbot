const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user;
let balance = parseFloat(localStorage.getItem('balance')) || 0.000;
let history = JSON.parse(localStorage.getItem('history')) || [];
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

// Bot Config
const ADMIN_ID = "8300015294";
const BOT_TOKEN = "8896244741:AAFLkaS7py9wY7ToUMbcd3TpwWSETkoPlEE";
const UPI_ID = "8075940486@omni";

let lastSpinTime = parseInt(localStorage.getItem('lastSpinTime')) || 0;
let bonusSpins = parseInt(localStorage.getItem('bonusSpins')) || 0;

// ---- 🔊 WEB AUDIO API SYNTHESIZER (NO EXTERNAL FILES) ----
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function playSound(type) {
    if (!soundEnabled) return;
    if (!audioCtx) audioCtx = new AudioCtx();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('soundEnabled', soundEnabled);
    document.getElementById('sound-btn').innerHTML = soundEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    showToast(soundEnabled ? "Audio Enabled" : "Audio Muted", "info");
}

// ---- 🍞 CUSTOM TOAST SYSTEM ----
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// UI State Updater
function updateUI() {
    document.getElementById('user-balance').innerText = balance.toFixed(3);
    document.getElementById('wallet-balance').innerText = balance.toFixed(3);
    
    let maxWithdraw = Math.max(0, balance - 0.5);
    document.getElementById('max-withdraw-val').innerText = `${maxWithdraw.toFixed(3)} TON`;

    if(user) {
        document.getElementById('profile-name').innerText = user.first_name;
        document.getElementById('profile-id').innerText = user.id;
        if(user.photo_url) document.getElementById('profile-dp').src = user.photo_url;
    }

    checkSpinCooldown();
}

function checkSpinCooldown() {
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    const badge = document.getElementById('spin-status-badge');
    const spinBtn = document.getElementById('spin-button');

    if (now - lastSpinTime >= cooldown) {
        badge.innerText = "Daily Spin: Ready!";
        badge.style.color = "#10b981";
        spinBtn.disabled = false;
    } else if (bonusSpins > 0) {
        badge.innerText = `Bonus Spins: ${bonusSpins}`;
        badge.style.color = "#00f2fe";
        spinBtn.disabled = false;
    } else {
        const diff = cooldown - (now - lastSpinTime);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        badge.innerText = `Cooldown: ${hours}h ${minutes}m`;
        badge.style.color = "#ef4444";
        spinBtn.innerText = "LOCKED";
    }
}

// Page Navigation
function switchPage(pageId) {
    tg.HapticFeedback.impactOccurred('light');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');

    document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${pageId}`).classList.add('active');

    if(pageId === 'history') renderHistory();
    if(pageId === 'wheel') checkSpinCooldown();
}

function switchWalletTab(type) {
    document.getElementById('deposit-box').style.display = type === 'deposit' ? 'block' : 'none';
    document.getElementById('withdraw-box').style.display = type === 'withdraw' ? 'block' : 'none';
    document.getElementById('tab-dep-btn').classList.toggle('active', type === 'deposit');
    document.getElementById('tab-with-btn').classList.toggle('active', type === 'withdraw');
}

// Deposit & Withdrawal Handlers
function generateDepositQR() {
    const amt = document.getElementById('dep-amount').value;
    if(!amt || amt < 50) {
        showToast("Minimum deposit is ₹50", "error");
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
    const msg = `📥 *DEPOSIT REQUEST*\nUser: ${userName}\nAmount: ₹${amt}`;

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${ADMIN_ID}&text=${encodeURIComponent(msg)}&parse_mode=Markdown`)
        .then(() => {
            showToast("Deposit Request Sent to Admin!", "success");
            document.getElementById('qr-section').style.display = 'none';
        });
}

function processWithdrawal() {
    const upi = document.getElementById('with-upi').value.trim();
    const amt = parseFloat(document.getElementById('with-amount').value);
    const maxWithdraw = balance - 0.5;

    if(!upi.includes('@')) return showToast("Enter valid UPI ID", "error");
    if(amt > maxWithdraw) return showToast(`Max withdrawable is ${Math.max(0, maxWithdraw).toFixed(3)} TON`, "error");

    balance -= amt;
    localStorage.setItem('balance', balance);
    addHistory("Withdrawal", `To ${upi}`, amt, 'loss');
    updateUI();

    const msg = `💸 *WITHDRAWAL REQUEST*\nUser: ${user?.first_name}\nUPI: \`${upi}\`\nAmt: ${amt} TON`;
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${ADMIN_ID}&text=${encodeURIComponent(msg)}&parse_mode=Markdown`)
        .then(() => {
            showToast("Payout Request Submitted!", "success");
        });
}

// WHEEL LOGIC WITH AUDIO & CONFETTI
const slices = [
    { label: "0.001 TON", val: 0.001, prob: 70, color: "#12192a" },
    { label: "0.01 TON",  val: 0.01,  prob: 5,  color: "#00f2fe" },
    { label: "0.1 TON",   val: 0.1,   prob: 1,  color: "#12192a" },
    { label: "0.01 TON",  val: 0.01,  prob: 5,  color: "#00f2fe" },
    { label: "0.5 TON",   val: 0.5,   prob: 0.5,color: "#12192a" },
    { label: "0.01 TON",  val: 0.01,  prob: 5,  color: "#00f2fe" },
    { label: "1.0 TON",   val: 1.0,   prob: 0.2,color: "#f59e0b" },
    { label: "0.01 TON",  val: 0.01,  prob: 5,  color: "#00f2fe" },
    { label: "0.1 TON",   val: 0.1,   prob: 1,  color: "#12192a" },
    { label: "0.5 TON",   val: 0.5,   prob: 0.5,color: "#00f2fe" },
    { label: "0.01 TON",  val: 0.01,  prob: 5,  color: "#12192a" },
    { label: "0.1 TON",   val: 0.1,   prob: 1,  color: "#00f2fe" },
    { label: "2.0 TON",   val: 2.0,   prob: 0.1,color: "#ef4444" }
];

const sliceAngle = 360 / slices.length;

function buildCleanWheel() {
    const board = document.getElementById('wheel-board');
    board.innerHTML = '';
    let gradientStops = slices.map((s, i) => `${s.color} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`);
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

let isSpinning = false, currentDeg = 0;

function spinWheel() {
    if (isSpinning) return;
    const now = Date.now();
    if (now - lastSpinTime < 24 * 60 * 60 * 1000 && bonusSpins <= 0) {
        return showToast("Daily Spin Cooldown Active!", "error");
    }

    isSpinning = true;
    if (bonusSpins > 0) bonusSpins--; else lastSpinTime = now;
    localStorage.setItem('bonusSpins', bonusSpins);
    localStorage.setItem('lastSpinTime', lastSpinTime);
    updateUI();

    // Wheel Spin Ticking Sound Interval
    let soundInterval = setInterval(() => playSound('tick'), 150);

    let rand = Math.random() * 100, sum = 0, winningIndex = 0;
    for (let i = 0; i < slices.length; i++) {
        sum += slices[i].prob;
        if (rand <= sum) { winningIndex = i; break; }
    }

    const spins = 5;
    const targetAngle = (winningIndex * sliceAngle) + (sliceAngle / 2);
    const finalDegree = currentDeg + (360 * spins) + (360 - targetAngle);

    document.getElementById('wheel-board').style.transform = `rotate(${finalDegree}deg)`;
    currentDeg = finalDegree;

    setTimeout(() => {
        clearInterval(soundInterval);
        playSound('win');
        
        // 🎆 Trigger Canvas Fireworks Confetti
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

        let wonVal = slices[winningIndex].val;
        balance += wonVal;
        localStorage.setItem('balance', balance);
        
        addHistory("Lucky Wheel", `Won ${wonVal} TON`, wonVal, 'win');
        document.getElementById('win-amount-text').innerText = `${wonVal} TON`;
        document.getElementById('win-modal').style.display = 'flex';
        
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
    container.innerHTML = history.length === 0 ? "<p style='color:#64748b; text-align:center;'>No activity logged.</p>" : "";
    history.forEach(item => {
        container.innerHTML += `
            <div class="glass-card" style="padding: 12px; display:flex; justify-content:space-between; margin-bottom:8px;">
                <div><strong>${item.game}</strong><br><small style="color:#64748b">${item.detail}</small></div>
                <div style="color:${item.type==='win'?'#10b981':'#ef4444'}; font-weight:800;">${item.type==='win'?'+':'-'}${item.amount} TON</div>
            </div>
        `;
    });
}

function copyRefLink() {
    bonusSpins++;
    localStorage.setItem('bonusSpins', bonusSpins);
    updateUI();
    showToast("Referral Link Copied! 1 Bonus Spin Added.", "success");
}

buildCleanWheel();
updateUI();
