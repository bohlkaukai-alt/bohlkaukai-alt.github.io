// ---------- Cookie- und Speicher-Einstellungen ----------
const OPTIONAL_STORAGE_KEYS = [
    'mf_location',
    'mf_radius',
    'mf_device_mode',
    'mf_device_forced',
    'mf_tutorial_seen',
    'mf_tutorial_done',
    'mf_sounds_enabled',
    'mf_notifications_enabled',
    'mf_custom_categories'
];

function getCookieConsent() {
    try { return localStorage.getItem('mf_cookie_consent') || 'unset'; }
    catch (e) { return 'unset'; }
}

function setCookieConsent(value) {
    try {
        localStorage.setItem('mf_cookie_consent', value);
        localStorage.setItem('mf_cookie_consent_updated_at', new Date().toISOString());
    } catch (e) {}
}

function optionalStorageAllowed() {
    return getCookieConsent() === 'accepted';
}

function clearOptionalStorage() {
    try { OPTIONAL_STORAGE_KEYS.forEach(k => localStorage.removeItem(k)); } catch (e) {}
}

function acceptOptionalCookies() {
    setCookieConsent('accepted');
    removeCookieBanner();
    if (typeof showToast === 'function') showToast('Optionale Speicherung aktiviert');
}

function rejectOptionalCookies() {
    setCookieConsent('rejected');
    clearOptionalStorage();
    removeCookieBanner();
    if (typeof showToast === 'function') showToast('Optionale Speicherung deaktiviert');
}

function removeCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.remove();
}

function showCookieBanner() {
    if (getCookieConsent() !== 'unset') return;
    if (document.getElementById('cookie-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.className = 'cookie-banner';
    banner.innerHTML = `
        <div>
            <strong>Cookies & Speicher</strong>
            <p>Wir nutzen notwendige Speicherung für Login und App-Funktionen. Optionale Speicherung z. B. für Standort, Tutorial, eigene Kategorien und Sounds kannst du ablehnen.</p>
            <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutzerklärung öffnen</a>
        </div>
        <div class="cookie-actions">
            <button class="btn btn-outline" onclick="rejectOptionalCookies()">Ablehnen</button>
            <button class="btn btn-primary" onclick="acceptOptionalCookies()">Akzeptieren</button>
        </div>
    `;
    document.body.appendChild(banner);
}

function openCookieSettings() {
    const consent = getCookieConsent();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>🍪 Cookies & Speicher</h2>
            <p class="small-muted" style="margin:8px 0 12px">Aktueller Status: <strong>${consent === 'accepted' ? 'Optionale Speicherung aktiviert' : consent === 'rejected' ? 'Optionale Speicherung deaktiviert' : 'Noch keine Auswahl'}</strong></p>
            <p>Notwendige Speicherung für Login und Sicherheit bleibt aktiv. Optionale Speicherung betrifft z. B. Standort, Tutorial-Status, Geräteauswahl, eigene Kategorien, Sounds und Benachrichtigungseinstellungen.</p>
            <a class="link-btn" href="datenschutz.html" target="_blank" rel="noopener">Datenschutzerklärung öffnen</a>
            <button class="btn btn-primary" onclick="acceptOptionalCookies(); this.closest('.modal-overlay').remove()">Optionale Speicherung erlauben</button>
            <button class="btn btn-outline" onclick="rejectOptionalCookies(); this.closest('.modal-overlay').remove()">Optionale Speicherung deaktivieren</button>
            <button class="btn btn-danger" onclick="clearOptionalStorage(); if(typeof showToast==='function')showToast('Optionale lokale Daten gelöscht')">Optionale lokale Daten löschen</button>
            <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Schließen</button>
        </div>
    `;
    document.body.appendChild(modal);
}

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(showCookieBanner, 700);
});
