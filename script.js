const tg = window.Telegram.WebApp;
tg.expand(); // Full screen

// User Data & Default Balance setup
const user = tg.initDataUnsafe?.user;
let userBalance = parseInt(localStorage.getItem('balance')) || 100; // Naye user ko 100 coins default

// Profile Setup Function
function loadProfile() {
    if (user) {
        document.getElementById('user-name').innerText = user.first_name;
        // Telegram kabhi-kabhi photo_url block karta hai, isliye fallback lagaya hai
        if (user.photo_url) {
            document.getElementById('user-photo').src = user.photo_url;
        }
    } else {
        document.getElementById('user-name').innerText = "Guest Player";
    }
    updateBalanceDisplay();
}

function updateBalanceDisplay() {
    document.getElementById('user-balance').innerText = userBalance;
    localStorage.setItem('balance', userBalance);
}

// ---------------- DAILY BONUS LOGIC ----------------
function claimDailyBonus() {
    tg.HapticFeedback.impactOccurred('medium');
    
    // Raat 12 baje ke liye Date ko local string me badalte hain
    const today = new Date().toLocaleDateString(); 
    const lastClaim = localStorage.getItem('lastDailyBonus');

    if (lastClaim === today) {
        tg.showAlert("Aapne aaj ka bonus already le liya hai. Raat 12 baje ke baad try karein!");
    } else {
        userBalance += 50; // Daily 50 coins
        localStorage.setItem('lastDailyBonus', today);
        updateBalanceDisplay();
        tg.showAlert("🎉 Badhai ho! Aapko 50 Daily Bonus Coins mile.");
    }
}

// ---------------- REFERRAL LOGIC (Frontend Mock) ----------------
function openReferral() {
    tg.HapticFeedback.impactOccurred('light');
    let userId = user ? user.id : '000';
    let referLink = `https://t.me/YourBotUsername?start=ref_${userId}`;
    
    tg.showPopup({
        title: 'Invite Friends 👥',
        message: `Per Refer: 50 Coins\nCommission: 1% of friend's gameplay.\n\nAapka Link:\n${referLink}`,
        buttons: [
            { id: 'copy', type: 'default', text: 'Copy Link' },
            { type: 'cancel', text: 'Close' }
        ]
    }, function(buttonId) {
        if (buttonId === 'copy') {
            // Note: Clipboard write browser me chalega, Tg WebApp me SDK required hai
            tg.showAlert("Link copy karna aur commission ka exact data backend lagne par kaam karega!");
        }
    });
}

// ---------------- GAME WIN/LOSS LOGIC (50% Win Rate) ----------------
function playGame(gameName, betAmount) {
    tg.HapticFeedback.impactOccurred('medium');

    if (userBalance < betAmount) {
        tg.showAlert(`❌ Balance low hai! Kam se kam ${betAmount} coins chahiye.`);
        return;
    }

    // Abhi game interface khulne ke bajaye direct result dikha rahe hain
    // 50% Win Rate Logic
    let isWin = Math.random() > 0.5; // 0.5 se upar aaya to Win, niche to Loss

    if (isWin) {
        let winAmount = betAmount * 2; // 10 lagaya, 20 mila
        userBalance = userBalance + (winAmount - betAmount);
        tg.showAlert(`🎉 WIN! Aapne ${gameName} mein ${winAmount} coins jeete.`);
    } else {
        userBalance = userBalance - betAmount; // 10 lagaya, haar gaye
        tg.showAlert(`😢 LOSS! Aapne ${gameName} mein ${betAmount} coins haar diye. Try again!`);
    }
    
    updateBalanceDisplay();
}

// App start hone par profile load karo
loadProfile();
