const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user;
let balance = parseFloat(localStorage.getItem('balance')) || 0.000;
let freeSpins = parseInt(localStorage.getItem('spins')) || 1; // New user gets 1 free spin
let history = JSON.parse(localStorage.getItem('history')) || [];

function updateUI() {
    document.getElementById('user-balance').innerText = balance.toFixed(3);
    document.getElementById('profile-balance').innerText = balance.toFixed(3);
    document.getElementById('spin-count').innerText = freeSpins;
    
    if(user) {
        document.getElementById('profile-name').innerText = user.first_name;
        document.getElementById('profile-id').innerText = user.id;
        if(user.photo_url) document.getElementById('profile-dp').src = user.photo_url;
    }
}

// ---- BOTTOM NAVIGATION LOGIC ----
function switchPage(pageId) {
    tg.HapticFeedback.impactOccurred('light');
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
    document.getElementById(`page-${pageId}`).style.display = 'block';

    // Update Nav Bar Active State
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.getElementById(`nav-${pageId}`).classList.add('active');

    if(pageId === 'history') renderHistory();
}

// ---- WHEEL GENERATION & LOGIC ----
// 13 Sections as requested
const wheelSlices = [
    { label: "0.001 💎", val: 0.001, prob: 70 }, // 70% chance (Safe for you)
    { label: "0.01 💎", val: 0.01, prob: 4 },    // Distributed
    { label: "0.1 💎", val: 0.1, prob: 1.5 },
    { label: "0.5 💎", val: 0.5, prob: 0.5 },
    { label: "0.01 💎", val: 0.01, prob: 4 },
    { label: "0.1 💎", val: 0.1, prob: 1.5 },
    { label: "1.0 💎", val: 1.0, prob: 0.2 },
    { label: "0.01 💎", val: 0.01, prob: 4 },
    { label: "0.1 💎", val: 0.1, prob: 1.5 },
    { label: "0.5 💎", val: 0.5, prob: 0.5 },
    { label: "0.01 💎", val: 0.01, prob: 4 },
    { label: "0.1 💎", val: 0.1, prob: 1.5 },
    { label: "2.0 💎", val: 2.0, prob: 0.1 }     // Very rare!
];

const totalSlices = wheelSlices.length;
const sliceDegree = 360 / totalSlices;

function drawWheel() {
    const wheelElement = document.getElementById('wheel');
    wheelElement.innerHTML = '';
    
    wheelSlices.forEach((slice, index) => {
        const div = document.createElement('div');
        div.className = 'wheel-slice';
        div.style.transform = `rotate(${index * sliceDegree}deg) skewY(${90 - sliceDegree}deg)`;
        
        // Alternate colors
        div.style.backgroundColor = index % 2 === 0 ? '#1e88e5' : '#151c2c';
        
        const span = document.createElement('span');
        span.innerText = slice.label;
        div.appendChild(span);
        wheelElement.appendChild(div);
    });
}

let isSpinning = false;
let currentRotation = 0;

function spinWheel() {
    if (isSpinning) return;
    if (freeSpins <= 0) {
        tg.showAlert("No free spins left! Refer friends to get more.");
        return;
    }

    isSpinning = true;
    freeSpins -= 1;
    localStorage.setItem('spins', freeSpins);
    updateUI();
    tg.HapticFeedback.impactOccurred('medium');

    // MAGIC: Rigged Probability Calculation
    let rand = Math.random() * 100;
    let sum = 0;
    let winningIndex = 0;
    
    for (let i = 0; i < wheelSlices.length; i++) {
        sum += wheelSlices[i].prob;
        if (rand <= sum) {
            winningIndex = i;
            break;
        }
    }

    // Wheel Animation Logic
    const spins = 5; // Kitni baar gol ghumega
    const extraDegrees = (360 - (winningIndex * sliceDegree)) - (sliceDegree / 2);
    const finalRotation = currentRotation + (360 * spins) + extraDegrees;

    const wheelElement = document.getElementById('wheel');
    wheelElement.style.transform = `rotate(${finalRotation}deg)`;
    currentRotation = finalRotation; // Save state for next spin

    setTimeout(() => {
        let wonAmount = wheelSlices[winningIndex].val;
        balance += wonAmount;
        localStorage.setItem('balance', balance);
        
        addHistory("Wheel Spin", `Won ${wonAmount} 💎`, wonAmount, 'win');
        
        tg.showAlert(`🎉 You won ${wonAmount} Grams!`);
        tg.HapticFeedback.notificationOccurred('success');
        updateUI();
        isSpinning = false;
    }, 4000); // 4 seconds animation matches CSS
}

// ---- HISTORY & REFERRAL LOGIC ----
function addHistory(game, detail, amount, type) {
    const record = { game, detail, amount, type, date: new Date().toLocaleTimeString() };
    history.unshift(record);
    if(history.length > 20) history.pop(); // Keep only last 20
    localStorage.setItem('history', JSON.stringify(history));
}

function renderHistory() {
    const container = document.getElementById('history-container');
    container.innerHTML = history.length === 0 ? "<p>No transactions yet.</p>" : "";
    
    history.forEach(item => {
        let amountClass = item.type === 'win' ? 'hist-win' : 'hist-loss';
        let sign = item.type === 'win' ? '+' : '-';
        container.innerHTML += `
            <div class="history-item">
                <div>
                    <strong>${item.game}</strong><br>
                    <small style="color:#888;">${item.date}</small>
                </div>
                <div class="${amountClass}">
                    <strong>${sign} ${item.amount} 💎</strong>
                </div>
            </div>
        `;
    });
}

function copyRefLink() {
    let userId = user ? user.id : '000';
    let link = `https://t.me/YourBotName?start=${userId}`;
    tg.showAlert(`Referral link generated (simulated):\n${link}\n\nShare to get 1 Free Spin per join!`);
}

// Start App
drawWheel();
updateUI();
