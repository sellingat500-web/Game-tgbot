let selectedPackage = null;

// Live Theme Color Switcher (Testing ke liye)
function changeTheme(theme) {
    const root = document.documentElement;
    if (theme === 'blue') {
        root.style.setProperty('--bg-color', '#0b0f19');
        root.style.setProperty('--card-bg', '#161e2e');
        root.style.setProperty('--primary-color', '#0284c7');
        root.style.setProperty('--accent-color', '#38bdf8');
    } else if (theme === 'purple') {
        root.style.setProperty('--bg-color', '#120b1e');
        root.style.setProperty('--card-bg', '#1e142e');
        root.style.setProperty('--primary-color', '#8b5cf6');
        root.style.setProperty('--accent-color', '#c084fc');
    } else if (theme === 'green') {
        root.style.setProperty('--bg-color', '#061a14');
        root.style.setProperty('--card-bg', '#0f2920');
        root.style.setProperty('--primary-color', '#059669');
        root.style.setProperty('--accent-color', '#34d399');
    } else if (theme === 'dark') {
        root.style.setProperty('--bg-color', '#000000');
        root.style.setProperty('--card-bg', '#111111');
        root.style.setProperty('--primary-color', '#333333');
        root.style.setProperty('--accent-color', '#ffffff');
    }
}

// Verify Player UID
function verifyPlayer() {
    const uid = document.getElementById('playerUid').value.trim();
    if (!uid) {
        alert("Please enter a Player UID!");
        return;
    }

    // Dummy verification UI display
    document.getElementById('playerName').innerText = "Gamer_" + uid.slice(-4);
    document.getElementById('displayUid').innerText = uid;
    document.getElementById('playerDetails').style.display = 'block';
}

// Select Item Package
function selectPkg(amount, price, cardElement) {
    document.querySelectorAll('.package-card').forEach(card => card.classList.remove('selected'));
    cardElement.classList.add('selected');

    selectedPackage = { amount, price };
    document.getElementById('selectedItemText').innerText = `${amount} Gems`;
    document.getElementById('selectedPriceText').innerText = `₹${price}`;
}

// Order Submission
function submitOrder() {
    const uid = document.getElementById('playerUid').value.trim();
    if (!uid) {
        alert("Please enter and verify Player UID first.");
        return;
    }
    if (!selectedPackage) {
        alert("Please select a package.");
        return;
    }

    alert(`Order Created successfully!\nUID: ${uid}\nItem: ${selectedPackage.amount} Gems\nPrice: ₹${selectedPackage.price}`);
}
