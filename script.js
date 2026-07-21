const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user;
let balance = parseFloat(localStorage.getItem('balance')) || 0.000;
let freeSpins = parseInt(localStorage.getItem('spins')) || 1;
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

// Page Navigation
function switchPage(pageId) {
    tg.HapticFeedback.impactOccurred('light');
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(`page-${pageId}`).style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${pageId}`).classList.add('active');

    if(pageId === 'history') renderHistory();
}

// ---- WHEEL SLICES CONFIGURATION ----
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

// DYNAMIC CONIC GRADIENT & TEXT PLACEMENT (No Distortion Fix)
function buildCleanWheel() {
    const board = document.getElementById('wheel-board');
    board.innerHTML = '';

    // Build Background CSS Conic Gradient
    let gradientStops = [];
    slices.forEach((slice, i) => {
        let start = i * sliceAngle;
        let end = (i + 1) * sliceAngle;
        gradientStops.push(`${slice.color} ${start}deg ${end}deg`);
    });
    board.style.background = `conic-gradient(${gradientStops.join(', ')})`;

    // Place Radial Text Labels
    slices.forEach((slice, i) => {
        const textDiv = document.createElement('div');
        textDiv.className = 'wheel-slice-text';
        
        let centerAngle = (i * sliceAngle) + (sliceAngle / 2);
        
        // Rotate text outward cleanly without skew
        textDiv.style.transform = `rotate(${centerAngle}deg) translateY(-105px) rotate(90deg)`;
        textDiv.innerText = slice.label;
        board.appendChild(textDiv);
    });
}

let isSpinning = false;
let currentDeg = 0;

function spinWheel() {
    if (isSpinning) return;
    if (freeSpins <= 0) {
        tg.showAlert("No free spins remaining! Refer friends to earn spins.");
        return;
    }

    isSpinning = true;
    freeSpins -= 1;
    localStorage.setItem('spins', freeSpins);
    updateUI();
    tg.HapticFeedback.impactOccurred('medium');

    // Rigged Logic (70% chance to hit 0.001 TON to protect profit)
    let rand = Math.random() * 100;
    let sum = 0;
    let winningIndex = 0;
    
    for (let i = 0; i < slices.length; i++) {
        sum += slices[i].prob;
        if (rand <= sum) {
            winningIndex = i;
            break;
        }
    }

    const spins = 5;
    const targetSliceAngle = (winningIndex * sliceAngle) + (sliceAngle / 2);
    const finalDegree = currentDeg + (360 * spins) + (360 - targetSliceAngle);

    const board = document.getElementById('wheel-board');
    board.style.transform = `rotate(${finalDegree}deg)`;
    currentDeg = finalDegree;

    setTimeout(() => {
        let wonVal = slices[winningIndex].val;
        balance += wonVal;
        localStorage.setItem('balance', balance);
        
        addHistory("Lucky Wheel", `Won ${wonVal} TON`, wonVal, 'win');
        
        // Show Win Modal
        document.getElementById('win-amount-text').innerText = `${wonVal} TON`;
        document.getElementById('win-modal').style.display = 'flex';
        
        tg.HapticFeedback.notificationOccurred('success');
        updateUI();
        isSpinning = false;
    }, 4000);
}

function closeWinModal() {
    document.getElementById('win-modal').style.display = 'none';
}

function addHistory(game, detail, amount, type) {
    history.unshift({ game, detail, amount, type, time: new Date().toLocaleTimeString() });
    if(history.length > 15) history.pop();
    localStorage.setItem('history', JSON.stringify(history));
}

function renderHistory() {
    const container = document.getElementById('history-container');
    container.innerHTML = history.length === 0 ? "<p style='color:#64748b; text-align:center;'>No activity yet.</p>" : "";
    history.forEach(item => {
        container.innerHTML += `
            <div class="history-item">
                <div><strong>${item.game}</strong><br><small style="color:#64748b">${item.time}</small></div>
                <div class="hist-win">+${item.amount} TON</div>
            </div>
        `;
    });
}

function copyRefLink() {
    let userId = user ? user.id : '000';
    let link = `https://t.me/YourBotName?start=${userId}`;
    tg.showAlert(`Link Copied!\n${link}\n\n1 Spin added per join.`);
}

buildCleanWheel();
updateUI();
