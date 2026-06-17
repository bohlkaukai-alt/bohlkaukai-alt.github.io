// ---------- LOGIN / REGISTRIERUNG ----------
function getAuthErrorMessage(error) {
    const code = error?.code || '';
    const message = error?.message || 'Unbekannter Fehler';
    const map = {
        'auth/invalid-email': 'Die E-Mail-Adresse ist ungültig.',
        'auth/user-disabled': 'Dieses Konto wurde deaktiviert.',
        'auth/user-not-found': 'Für diese E-Mail-Adresse wurde kein Konto gefunden.',
        'auth/wrong-password': 'Das Passwort ist falsch.',
        'auth/invalid-login-credentials': 'E-Mail oder Passwort ist falsch.',
        'auth/missing-password': 'Bitte Passwort eingeben.',
        'auth/email-already-in-use': 'Diese E-Mail-Adresse ist bereits registriert.',
        'auth/weak-password': 'Das Passwort ist zu schwach. Nutze mindestens 6 Zeichen.',
        'auth/network-request-failed': 'Netzwerkfehler. Prüfe Internetverbindung, Domain und HTTPS.',
        'auth/unauthorized-domain': 'Diese Domain ist in Firebase Auth nicht freigegeben.',
        'auth/operation-not-allowed': 'E-Mail/Passwort-Login ist in Firebase nicht aktiviert.'
    };
    return map[code] || message;
}

function showInlineAuthError(text) {
    const box = document.getElementById('auth-error-box');
    if (!box) {
        showToast(text);
        return;
    }
    box.textContent = text;
    box.classList.remove('hidden');
}

function clearInlineAuthError() {
    const box = document.getElementById('auth-error-box');
    if (box) {
        box.textContent = '';
        box.classList.add('hidden');
    }
}

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
                <div id="auth-error-box" class="auth-error hidden"></div>
                <input id="login-email" class="form-input" placeholder="E-Mail" autocomplete="email" inputmode="email">
                <input id="login-password" type="password" class="form-input" placeholder="Passwort" autocomplete="current-password" onkeydown="if(event.key==='Enter') login()">
                <button id="login-button" class="btn btn-accent" onclick="login()">Anmelden</button>
                <button class="btn btn-outline" onclick="showRegister()" style="margin-top:8px">Registrieren</button>
                <p class="login-help">Falls der Login auf einem eigenen Server nicht funktioniert: Domain in Firebase Authentication → Settings → Authorized domains eintragen.</p>
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
                <div id="auth-error-box" class="auth-error hidden"></div>
                <input id="reg-name" class="form-input" placeholder="Name" autocomplete="name">
                <input id="reg-email" class="form-input" placeholder="E-Mail" autocomplete="email" inputmode="email">
                <input id="reg-password" type="password" class="form-input" placeholder="Passwort" autocomplete="new-password">
                <input id="reg-birthdate" type="date" class="form-input">
        <label class="privacy-check">
            <input id="reg-privacy" type="checkbox">
            <span>Ich akzeptiere die <a href="datenschutz.html" target="_blank" rel="noopener">Datenschutzerklärung</a>.</span>
        </label>
                <button id="register-button" class="btn btn-accent" onclick="register()">Registrieren</button>
                <button class="btn btn-outline" onclick="showLoginScreen()">Zurück</button>
            </div>
        </div>`;
    if (typeof updateThemeToggleButtons === 'function') updateThemeToggleButtons(document.body?.getAttribute('data-theme') || getSavedTheme());
}

async function login() {
    const e = document.getElementById('login-email')?.value.trim();
    const p = document.getElementById('login-password')?.value;
    const btn = document.getElementById('login-button');
    clearInlineAuthError();
    if (!e || !p) { showInlineAuthError('E-Mail und Passwort eingeben.'); return; }
    try {
        if (btn) { btn.disabled = true; btn.textContent = 'Wird angemeldet...'; }
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        await auth.signInWithEmailAndPassword(e, p);
        showToast('Angemeldet');
    } catch(err) {
        showInlineAuthError(getAuthErrorMessage(err));
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Anmelden'; }
    }
}

async function register() {
    const n = document.getElementById('reg-name')?.value.trim();
    const e = document.getElementById('reg-email')?.value.trim();
    const p = document.getElementById('reg-password')?.value;
    const b = document.getElementById('reg-birthdate')?.value;
    const btn = document.getElementById('register-button');
    clearInlineAuthError();
    if (!n || !e || !p || !b) { showInlineAuthError('Alle Felder ausfüllen.'); return; }
    const age = Math.floor((new Date() - new Date(b)) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 13) { showInlineAuthError('Du musst mindestens 13 Jahre alt sein.'); return; }
    try {
        if (btn) { btn.disabled = true; btn.textContent = 'Wird registriert...'; }
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const r = await auth.createUserWithEmailAndPassword(e, p);
        await ensureUserProfile(r.user, { name: n, email: e, age });
        showToast('Registriert');
    } catch(err) {
        showInlineAuthError(getAuthErrorMessage(err));
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Registrieren'; }
    }
}

async function logout() {
    await auth.signOut();
    showToast('Abgemeldet');
    navigateTo('login');
}

async function ensureUserProfile(user, extra = {}) {
    const fallback = {
        uid: user.uid,
        email: user.email,
        name: extra.name || user.email?.split('@')[0] || 'Nutzer',
        age: extra.age || 18,
        ...extra
    };

    try {
        const ref = db.collection('users').doc(user.uid);
        const doc = await ref.get();
        if (doc.exists) return { uid: user.uid, email: user.email, ...doc.data() };
        await ref.set({ ...fallback, createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return fallback;
    } catch (err) {
        console.warn('Firestore users-Profil konnte nicht gelesen/geschrieben werden:', err);
        // Wichtig: Login trotzdem nicht blockieren, wenn nur das Profil-Dokument Probleme macht.
        showToast('Angemeldet, aber Profildaten konnten nicht geladen werden.');
        return fallback;
    }
}

function afterSuccessfulAuth() {
    viewedJobs = JSON.parse(localStorage.getItem(`mf_viewed_${currentUser.uid}`) || '[]');
    document.getElementById('bottom-nav')?.classList.remove('hidden');
    // Nicht vom Standort blockieren lassen. Erst öffnen, Standort danach aktualisieren.
    navigateTo('jobs');
    getPreciseLocation(() => {
        if (currentPage === 'jobs') loadJobs();
    });
}

function bindAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        try {
            if (user) {
                currentUser = await ensureUserProfile(user);
                afterSuccessfulAuth();
            } else {
                currentUser = null;
                viewedJobs = JSON.parse(localStorage.getItem('mf_viewed_guest') || '[]');
                document.getElementById('bottom-nav')?.classList.add('hidden');
                // Login sofort zeigen, Standortabfrage nicht davor setzen.
                navigateTo('login');
                getPreciseLocation();
            }
        } catch (err) {
            console.error('Auth-State-Fehler:', err);
            currentUser = null;
            document.getElementById('bottom-nav')?.classList.add('hidden');
            navigateTo('login');
            showInlineAuthError('Login-Fehler: ' + getAuthErrorMessage(err));
        }
    });
}
