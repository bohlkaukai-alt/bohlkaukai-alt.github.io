// ---------- PROFIL / EINSTELLUNGEN ----------
function showProfileScreen() {
    updateHeader('profile');
    document.getElementById('main-content').innerHTML = `<div style="padding:14px">
        <div class="card" style="text-align:center;cursor:auto">
            <div class="profile-avatar">${escapeHtml((currentUser?.name || '?').charAt(0).toUpperCase())}</div>
            <h2>${escapeHtml(currentUser?.name || '')}</h2>
            <p class="small-muted">${escapeHtml(currentUser?.email || '')}</p>
            ${isAdmin() ? '<span class="admin-badge">Admin</span>' : ''}
        </div>
        <div class="card" onclick="navigateTo('my-jobs')"><strong>Meine Jobs</strong><p class="small-muted">Eigene Anzeigen verwalten</p></div>
        <div class="card" onclick="navigateTo('ratings')"><strong>Bewertungen</strong><p class="small-muted">Bewertungen ansehen</p></div>
        <div class="card" onclick="navigateTo('settings')"><strong>Einstellungen</strong><p class="small-muted">Radius, Währung, Design</p></div>
        <div class="card" onclick="navigateTo('edit-profile')"><strong>Profil bearbeiten</strong></div>
        <button class="btn btn-danger" onclick="logout()">Abmelden</button>
    </div>`;
}
function editProfileScreen() {
    updateHeader('edit-profile');
    document.getElementById('main-content').innerHTML = `<div style="padding:14px">
        <h2>Profil bearbeiten</h2>
        <input id="profile-name" class="form-input" value="${escapeHtml(currentUser?.name || '')}" placeholder="Name">
        <button class="btn btn-accent" onclick="saveProfile()">Speichern</button>
    </div>`;
}
async function saveProfile() {
    const name = document.getElementById('profile-name').value.trim();
    if (!name) { showToast('Name eingeben'); return; }
    await db.collection('users').doc(currentUser.uid).set({ name }, { merge: true });
    currentUser.name = name;
    showToast('Profil gespeichert');
    navigateTo('profile');
}
function showSettingsScreen() {
    updateHeader('settings');
    document.getElementById('main-content').innerHTML = `<div style="padding:14px">
        <h2>Einstellungen</h2>
        <div class="settings-item"><span>Suchradius</span><select onchange="updateRadius(this.value)">${radiusOptions.map(r => `<option value="${r}" ${r === radiusFilter ? 'selected' : ''}>${r} km</option>`).join('')}</select></div>
        <div class="settings-item"><span>Währung</span><select onchange="updateCurrency(this.value)">${Object.keys(currencySymbols).map(c => `<option value="${c}" ${c === currentCurrency ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="settings-item" onclick="toggleTheme()"><span>Design</span><span><span id="theme-status-text">${document.body?.getAttribute('data-theme') === 'dark' ? 'Darkmode' : 'Hellmodus'}</span> <span class="material-icons" style="vertical-align:middle;font-size:18px">contrast</span></span></div>
        <div class="settings-item" onclick="navigateTo('feedback')"><span>Feedback senden</span><span>›</span></div>
    </div>`;
}
function updateRadius(value) {
    radiusFilter = parseInt(value, 10);
    localStorage.setItem('mf_radius', String(radiusFilter));
    showToast('Radius gespeichert');
}
function updateCurrency(value) {
    currentCurrency = value;
    localStorage.setItem('app_currency', value);
    showToast('Währung gespeichert');
}
function showFeedbackScreen() {
    updateHeader('feedback');
    document.getElementById('main-content').innerHTML = `<div style="padding:14px">
        <h2>Feedback</h2>
        <textarea id="feedback-text" class="form-textarea" placeholder="Dein Feedback"></textarea>
        <button class="btn btn-accent" onclick="sendFeedback()">Senden</button>
    </div>`;
}
async function sendFeedback() {
    const text = document.getElementById('feedback-text').value.trim();
    if (!text) { showToast('Text eingeben'); return; }
    await db.collection('feedback').add({ text, userId: currentUser.uid, email: currentUser.email, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    showToast('Feedback gesendet');
    navigateTo('profile');
}
