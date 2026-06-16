// Firebase Config - aus includes/config.php übergeben
const firebaseConfig = window.MINIJOB_FIREBASE_CONFIG || {};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---------- GLOBALE VARIABLEN ----------
let currentUser = null;
let selectedCategory = null;
let currentPage = '';
let currentPageData = null;
let navigationHistory = [];
let userLocation = null;
let radiusFilter = parseInt(localStorage.getItem('mf_radius') || '5', 10);
let viewedJobs = JSON.parse(localStorage.getItem('mf_viewed_guest') || '[]');
let currentJobTypeFilter = 'all';
let selectedJobType = 'offer';
let currentCurrency = localStorage.getItem('app_currency') || 'EUR';
let jobsUnsubscribe = null;
let chatsUnsubscribe = null;
let messagesUnsubscribe = null;
let mapInstance = null;
let mapMarkersLayer = null;

const currencySymbols = { EUR:'€', USD:'$', GBP:'£', TRY:'₺', CHF:'Fr' };
const adminEmails = ['bohlkaukai@gmail.com', 'kai16boehlkau@gmail.com'];
const categories = ['Alle','Nachhilfe','Hundesitting','Babysitting','Gartenarbeit','Einkaufen helfen','Computerhilfe','Haushaltshilfe','Sonstiges','Eigene...'];
const radiusOptions = [1,3,5,10,20,30,50];
const categoryEmoji = { 'Nachhilfe':'📚','Hundesitting':'🐕','Babysitting':'👶','Gartenarbeit':'🌿','Einkaufen helfen':'🛒','Computerhilfe':'💻','Haushaltshilfe':'🧹','Sonstiges':'⋯' };
const categoryColor = { 'Nachhilfe':'#4CAF50','Hundesitting':'#8D6E63','Babysitting':'#FF9800','Gartenarbeit':'#66BB6A','Einkaufen helfen':'#42A5F5','Computerhilfe':'#7E57C2','Haushaltshilfe':'#EF5350','Sonstiges':'#78909C' };

function getCurrencySymbol() { return currencySymbols[currentCurrency] || '€'; }
function formatPayment(amount) { return `${amount} ${getCurrencySymbol()}`; }
function isAdmin() { return currentUser && adminEmails.includes(currentUser.email); }
function saveViewedJobs() {
    const key = currentUser ? `mf_viewed_${currentUser.uid}` : 'mf_viewed_guest';
    localStorage.setItem(key, JSON.stringify(viewedJobs));
}
function showToast(msg) {
    let t = document.querySelector('.toast');
    if (t) t.remove();
    t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function escapeJs(str) {
    return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        gain.gain.value = 0.3;
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        if ('vibrate' in navigator) navigator.vibrate(200);
    } catch(e) {}
}
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}
function getPreciseLocation(cb) {
    const cached = localStorage.getItem('mf_location');
    if (cached && !userLocation) {
        try { userLocation = JSON.parse(cached); } catch(e) {}
    }
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async pos => {
            const { latitude, longitude } = pos.coords;
            try {
                const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=de`);
                const data = await resp.json();
                const city = data.address?.city || data.address?.town || data.address?.village || 'Mein Standort';
                userLocation = { lat: latitude, lng: longitude, name: city };
            } catch(e) {
                userLocation = { lat: latitude, lng: longitude, name: 'Mein Standort' };
            }
            localStorage.setItem('mf_location', JSON.stringify(userLocation));
            if (cb) cb();
        }, () => {
            if (!userLocation) userLocation = { lat: 51.89, lng: 10.17, name: 'Seesen' };
            if (cb) cb();
        }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
    } else {
        if (!userLocation) userLocation = { lat: 51.89, lng: 10.17, name: 'Seesen' };
        if (cb) cb();
    }
}
async function getRandomPointInCity(cityName) {
    try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`);
        const data = await resp.json();
        if (data && data.length > 0) {
            let lat = parseFloat(data[0].lat);
            let lng = parseFloat(data[0].lon);
            const offset = 0.018;
            lat += (Math.random() - 0.5) * offset;
            lng += (Math.random() - 0.5) * offset;
            return { lat, lng };
        }
    } catch(e) {}
    if (userLocation) {
        const offset = 0.01;
        return { lat: userLocation.lat + (Math.random() - 0.5) * offset, lng: userLocation.lng + (Math.random() - 0.5) * offset };
    }
    return { lat: 51.89, lng: 10.17 };
}
function formatDate(value) {
    if (!value) return '';
    const date = value.toDate ? value.toDate() : new Date(value);
    return date.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}
function cleanupListeners() {
    if (jobsUnsubscribe) { jobsUnsubscribe(); jobsUnsubscribe = null; }
    if (chatsUnsubscribe && currentPage !== 'chats') { chatsUnsubscribe(); chatsUnsubscribe = null; }
    if (messagesUnsubscribe && currentPage !== 'chat') { messagesUnsubscribe(); messagesUnsubscribe = null; }
}
