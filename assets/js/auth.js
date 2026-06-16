// ---------- LOGIN / REGISTRIERUNG ----------
function showLoginScreen() {
    document.getElementById('main-content').innerHTML = `
        <div class="login-screen">
            <div class="login-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                    <div>
                        <div class="login-logo">💼</div>
                        <h2 class="login-title"><span class="brand-gradient">MiniJob</span> Finder</h2>
                        <p class="login-subtitle">Jobs in deiner Nähe finden, anbieten und direkt Kontakt aufnehmen.</p>
                    </div>
                    ${typeof themeToggleMarkup === 'function' ? themeToggleMarkup() : ''}
                </div>
                <input id="login-email" class="form-input" placeholder="E-Mail" autocomplete="email">
                <input id="login-password" type="password" class="form-input" placeholder="Passwort" autocomplete="current-password">
                <button class="btn btn-accent" onclick="login()">Anmelden</button>
                <button class="btn btn-outline" onclick="showRegister()" style="margin-top:8px">Registrieren</button>
            </div>
        </div>`;
    if (typeof updateThemeToggleButtons === 'function') updateThemeToggleButtons(document.body?.getAttribute('data-theme') || getSavedTheme());
}
function showRegister() {
    document.getElementById('main-content').innerHTML = `
        <div class="login-screen">
            <div class="login-card">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px">
                    <div>
                        <h2 class="login-title"><span class="brand-gradient">Konto</span> erstellen</h2>
                        <p class="login-subtitle">Registriere dich, um Jobs zu erstellen und Chats zu nutzen.</p>
                    </div>
                    ${typeof themeToggleMarkup === 'function' ? themeToggleMarkup() : ''}
                </div>
                <input id="reg-name" class="form-input" placeholder="Name">
                <input id="reg-email" class="form-input" placeholder="E-Mail" autocomplete="email">
                <input id="reg-password" type="password" class="form-input" placeholder="Passwort" autocomplete="new-password">
                <input id="reg-birthdate" type="date" class="form-input">
                <button class="btn btn-accent" onclick="register()">Registrieren</button>
                <button class="btn btn-outline" onclick="showLoginScreen()">Zurück</button>
            </div>
        </div>`;
    if (typeof updateThemeToggleButtons === 'function') updateThemeToggleButtons(document.body?.getAttribute('data-theme') || getSavedTheme());
}
async function login() {
    const e = document.getElementById('login-email')?.value.trim();
    const p = document.getElementById('login-password')?.value;
    if (!e || !p) { showToast('E-Mail und Passwort eingeben'); return; }
    try {
        await auth.signInWithEmailAndPassword(e, p);
        showToast('Angemeldet');
    } catch(err) {
        showToast('Fehler: ' + err.message);
    }
}
async function register() {
    const n = document.getElementById('reg-name')?.value.trim();
    const e = document.getElementById('reg-email')?.value.trim();
    const p = document.getElementById('reg-password')?.value;
    const b = document.getElementById('reg-birthdate')?.value;
    if (!n || !e || !p || !b) { showToast('Alle Felder ausfüllen'); return; }
    const age = Math.floor((new Date() - new Date(b)) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 13) { showToast('Mindestens 13 Jahre'); return; }
    try {
        const r = await auth.createUserWithEmailAndPassword(e, p);
        await db.collection('users').doc(r.user.uid).set({ name: n, email: e, age: age, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        showToast('Registriert');
    } catch(err) {
        showToast('Fehler: ' + err.message);
    }
}
async function logout() {
    await auth.signOut();
    showToast('Abgemeldet');
    navigateTo('login');
}
function bindAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                currentUser = { uid: user.uid, email: user.email, ...doc.data() };
            } else {
                currentUser = { uid: user.uid, email: user.email, name: user.email.split('@')[0], age: 18 };
                await db.collection('users').doc(user.uid).set(currentUser, { merge: true });
            }
            viewedJobs = JSON.parse(localStorage.getItem(`mf_viewed_${currentUser.uid}`) || '[]');
            document.getElementById('bottom-nav').classList.remove('hidden');
            getPreciseLocation(() => navigateTo('jobs'));
        } else {
            currentUser = null;
            viewedJobs = JSON.parse(localStorage.getItem('mf_viewed_guest') || '[]');
            document.getElementById('bottom-nav').classList.add('hidden');
            getPreciseLocation(() => navigateTo('login'));
        }
    });
}
