// Telegram Web App API ko initialize karna
const tg = window.Telegram.WebApp;

// Mini app ko full screen mein kholna
tg.expand();

// User ka data Telegram se nikalna
const user = tg.initDataUnsafe?.user;

if (user) {
    document.getElementById('user-info').innerText = `Hello, ${user.first_name}! Ready to play?`;
} else {
    document.getElementById('user-info').innerText = "Play on Telegram for the best experience!";
}

// Button click hone par alert dikhana (Baad mein isko apne game logic se replace kar dena)
function playGame(gameName) {
    // Ye vibration effect dega phone me jab button dabega
    tg.HapticFeedback.impactOccurred('medium'); 
    
    alert(`${gameName} is starting... Backend integration required!`);
}
