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
function isAdminAccount() { return currentUser && adminEmails.includes(currentUser.email); }
function isAdmin() { return isAdminAccount() && localStorage.getItem('mf_admin_mode') === 'on'; }
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
function getPreciseLocation(cb, forceRefresh = false) {
    const saved = localStorage.getItem('mf_location');
    if (!forceRefresh && saved) {
        try {
            userLocation = JSON.parse(saved);
            if (cb) cb();
            return;
        } catch (e) {}
    }

    if (!('geolocation' in navigator)) {
        userLocation = userLocation || { lat: 51.89, lng: 10.17, name: 'Seesen', address: 'Seesen', accuracy: null, source: 'fallback' };
        localStorage.setItem('mf_location', JSON.stringify(userLocation));
        if (cb) cb();
        return;
    }

    navigator.geolocation.getCurrentPosition(async pos => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 0);

        let name = 'Mein Standort';
        let addressText = '';
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=de`;
            const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
            const data = await resp.json();
            const a = data.address || {};
            name = a.city || a.town || a.village || a.municipality || a.county || 'Mein Standort';
            const road = a.road || a.pedestrian || a.footway || a.path || '';
            const house = a.house_number || '';
            const postcode = a.postcode || '';
            addressText = [road && (road + (house ? ' ' + house : '')), postcode, name].filter(Boolean).join(', ');
        } catch (e) {}

        userLocation = {
            lat: latitude,
            lng: longitude,
            name: name,
            address: addressText || name,
            accuracy: accuracy,
            source: 'gps'
        };

        localStorage.setItem('mf_location', JSON.stringify(userLocation));
        if (cb) cb();
    }, () => {
        if (!userLocation) {
            userLocation = { lat: 51.89, lng: 10.17, name: 'Seesen', address: 'Seesen', accuracy: null, source: 'fallback' };
        }
        localStorage.setItem('mf_location', JSON.stringify(userLocation));
        if (cb) cb();
    }, {
        enableHighAccuracy: true,
        timeout: 18000,
        maximumAge: forceRefresh ? 0 : 20000
    });
}
async function getRandomPointInCity(cityName) {
    return geocodeAddress(cityName);
}

async function geocodeAddress(query) {
    const q = (query || '').trim();
    if (!q && userLocation) {
        return { lat: userLocation.lat, lng: userLocation.lng, displayName: userLocation.address || userLocation.name };
    }

    try {
        const searchUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&addressdetails=1&accept-language=de`;
        const resp = await fetch(searchUrl, { headers: { 'Accept': 'application/json' } });
        const data = await resp.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                displayName: data[0].display_name || q,
                source: 'geocoded'
            };
        }
    } catch (e) {}

    if (userLocation) {
        return {
            lat: userLocation.lat,
            lng: userLocation.lng,
            displayName: userLocation.address || userLocation.name,
            source: 'current-location-fallback'
        };
    }

    return { lat: 51.89, lng: 10.17, displayName: 'Seesen', source: 'fallback' };
}

function refreshMyLocation() {
    showToast('Standort wird genau bestimmt...');
    getPreciseLocation(() => {
        const txt = userLocation?.accuracy ? `Standort aktualisiert: ca. ${userLocation.accuracy} m genau` : 'Standort aktualisiert';
        showToast(txt);
        if (currentPage === 'jobs') {
            showJobsScreen();
        } else if (currentPage === 'map') {
            if (mapInstance && userLocation) {
                mapInstance.flyTo([userLocation.lat, userLocation.lng], 14);
            } else {
                showMapScreen();
            }
        } else {
            updateHeader(currentPage);
        }
    }, true);
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
