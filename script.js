const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user;
let userBalance = parseInt(localStorage.getItem('balance')) || 0; 
let currentDepositAmount = 0;

// Admin details
const ADMIN_ID = "8300015294";
const BOT_TOKEN = "8896244741:AAFLkaS7py9wY7ToUMbcd3TpwWSETkoPlEE";
const UPI_ID = "8075940486@omni";

function loadProfile() {
    if (user && user.photo_url) {
        document.getElementById('user-photo').src = user.photo_url;
    }
    document.getElementById('user-balance').innerText = userBalance.toFixed(2);
}

// Modal Logics
function openWallet() {
    tg.HapticFeedback.impactOccurred('light');
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('wallet-modal').style.display = 'block';
}

function closeModals() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('wallet-modal').style.display = 'none';
    document.getElementById('amount-modal').style.display = 'none';
    document.getElementById('qr-modal').style.display = 'none';
    document.getElementById('deposit-amount').value = ''; // clear input
}

function openDepositAmount() {
    document.getElementById('wallet-modal').style.display = 'none';
    document.getElementById('amount-modal').style.display = 'block';
}

// Generate UPI Link and QR
function generateQR() {
    const amount = document.getElementById('deposit-amount').value;
    
    if (!amount || amount < 50) {
        tg.showAlert("Please enter a valid amount (Minimum ₹50)");
        return;
    }

    currentDepositAmount = amount;
    document.getElementById('amount-modal').style.display = 'none';
    document.getElementById('qr-modal').style.display = 'block';
    document.getElementById('show-amount').innerText = `₹${amount}`;

    // UPI String Format
    const upiString = `upi://pay?pa=${UPI_ID}&pn=Rarism&am=${amount}&cu=INR`;
    
    // Free API to generate QR from string
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
    document.getElementById('qr-code-img').src = qrUrl;
}

// Send Request to Admin via Telegram Bot API
function sendAdminRequest() {
    tg.HapticFeedback.impactOccurred('medium');
    
    const userName = user ? user.first_name : "Guest";
    const userId = user ? user.id : "000000";
    
    // Message jo admin ko jayega
    const textMessage = `🔔 *NEW DEPOSIT REQUEST*\n\n👤 *User:* ${userName}\n🆔 *User ID:* ${userId}\n💰 *Amount:* ₹${currentDepositAmount}\n\nPlease check your bank/UPI app and add balance to this user.`;

    // Telegram Bot API URL
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${ADMIN_ID}&text=${encodeURIComponent(textMessage)}&parse_mode=Markdown`;

    // Fetch call directly from frontend
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.ok) {
                tg.showAlert("✅ Payment Request Sent! Admin will verify and add balance soon.");
                closeModals();
            } else {
                tg.showAlert("❌ Error sending request. Please contact support.");
            }
        })
        .catch(error => {
            tg.showAlert("❌ Network error.");
        });
}

loadProfile();
