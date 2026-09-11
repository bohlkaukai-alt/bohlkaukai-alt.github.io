
// ---------- E-Mail-Validierung ----------
const blockedEmailDomains = [
    'example.com', 'test.com', 'mailinator.com', 'tempmail.com',
    '10minutemail.com', 'guerrillamail.com', 'yopmail.com', 'trashmail.com'
];

const commonEmailDomainTypos = {
    'gmal.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmail.de': 'gmail.com',
    'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com',
    'web.d': 'web.de',
    'gmx.d': 'gmx.de'
};

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function validateEmailStrict(email) {
    const value = normalizeEmail(email);

    if (!value) return { valid: false, message: 'Bitte E-Mail-Adresse eingeben.' };
    if (value.length > 254) return { valid: false, message: 'Die E-Mail-Adresse ist zu lang.' };
    if (/\s/.test(value)) return { valid: false, message: 'Die E-Mail-Adresse darf keine Leerzeichen enthalten.' };

    const basicPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
    if (!basicPattern.test(value)) {
        return { valid: false, message: 'Bitte eine gültige E-Mail-Adresse eingeben, z. B. name@example.de.' };
    }

    const parts = value.split('@');
    if (parts.length !== 2) return { valid: false, message: 'Die E-Mail-Adresse darf nur ein @ enthalten.' };

    const local = parts[0];
    const domain = parts[1];

    if (!local || local.length > 64) return { valid: false, message: 'Der Teil vor dem @ ist ungültig oder zu lang.' };
    if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
        return { valid: false, message: 'Der Teil vor dem @ enthält ungültige Punkte.' };
    }

    if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
        return { valid: false, message: 'Die Domain der E-Mail-Adresse ist ungültig.' };
    }

    const tld = domain.split('.').pop();
    if (!tld || tld.length < 2 || !/^[a-z]+$/i.test(tld)) {
        return { valid: false, message: 'Die Endung der E-Mail-Adresse ist ungültig.' };
    }

    if (blockedEmailDomains.includes(domain)) {
        return { valid: false, message: 'Diese E-Mail-Domain ist nicht erlaubt.' };
    }

    if (commonEmailDomainTypos[domain]) {
        return { valid: false, message: 'Meintest du ' + local + '@' + commonEmailDomainTypos[domain] + '? Bitte E-Mail korrigieren.' };
    }

    return { valid: true, email: value };
}

function showEmailValidationError(message) {
    const existing = document.getElementById('email-validation-error');
    if (existing) existing.remove();

    const emailInput = document.getElementById('reg-email') || document.getElementById('login-email');
    if (!emailInput) {
        if (typeof showToast === 'function') showToast(message);
        return;
    }

    const div = document.createElement('div');
    div.id = 'email-validation-error';
    div.className = 'auth-error';
    div.textContent = message;
    emailInput.insertAdjacentElement('afterend', div);
    emailInput.focus();
}

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
        'auth/operation-not-allowed': 'E-Mail/Passwort-Login ist in Firebase nicht aktiviert.',
        'auth/admin-restricted-operation': 'Anonymes Login ist nicht aktiviert. Bitte in Firebase Console unter Authentication → Sign-in method → Anonymous aktivieren.'
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
                <input id="login-email" type="email" inputmode="email" autocomplete="email" class="form-input" placeholder="E-Mail" autocomplete="email" inputmode="email">
                <input id="login-password" type="password" class="form-input" placeholder="Passwort" autocomplete="current-password" onkeydown="if(event.key==='Enter') login()">
                <button id="login-button" class="btn btn-accent" onclick="login()">Anmelden</button>
                <button class="btn btn-outline" onclick="showRegister()" style="margin-top:8px">Registrieren</button>
                <div id="guest-login-section" style="margin-top:12px"></div>
                <p class="login-help">Falls der Login auf einem eigenen Server nicht funktioniert: Domain in Firebase Authentication → Settings → Authorized domains eintragen.</p>
            </div>
        </div>`;
    if (typeof updateThemeToggleButtons === 'function') updateThemeToggleButtons(document.body?.getAttribute('data-theme') || getSavedTheme());
    checkGuestAccess();
}

async function checkGuestAccess() {
    const section = document.getElementById('guest-login-section');
    if (!section) return;
    try {
        const snap = await db.collection('users').where('guestAccessEnabled', '==', true).limit(1).get({ source: 'server' });
        if (!snap.empty) {
            section.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                    <div style="flex:1;height:1px;background:var(--border)"></div>
                    <span class="small-muted" style="white-space:nowrap">oder</span>
                    <div style="flex:1;height:1px;background:var(--border)"></div>
                </div>
                <button class="btn btn-outline" onclick="loginAsGuest()" style="width:100%">
                    👤 Als Gast fortfahren
                </button>`;
        } else {
            section.innerHTML = '';
        }
    } catch (e) {
        section.innerHTML = '';
    }
}

async function loginAsGuest() {
    const btn = document.querySelector('#guest-login-section .btn');
    try {
        if (btn) { btn.disabled = true; btn.textContent = 'Wird angemeldet...'; }
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        await auth.signInAnonymously();
        showToast('Als Gast angemeldet');
    } catch (err) {
        showInlineAuthError(getAuthErrorMessage(err));
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '👤 Als Gast fortfahren'; }
    }
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
                <input id="reg-email" type="email" inputmode="email" autocomplete="email" class="form-input" placeholder="E-Mail" autocomplete="email" inputmode="email">
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
    const e = normalizeEmail(document.getElementById('login-email')?.value).trim();
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
    const e = normalizeEmail(document.getElementById('reg-email')?.value).trim();
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
        await r.user.sendEmailVerification().catch(() => {});
        await ensureUserProfile(r.user, { name: n, email: e, age });
        showToast('Registriert. Bitte E-Mail-Postfach prüfen.');
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
                if (user.isAnonymous) {
                    currentUser = { uid: user.uid, isAnonymous: true, name: 'Gast', email: null };
                } else {
                    currentUser = await ensureUserProfile(user);
                }
                afterSuccessfulAuth();
            } else {
                currentUser = null;
                viewedJobs = JSON.parse(localStorage.getItem('mf_viewed_guest') || '[]');
                document.getElementById('bottom-nav')?.classList.add('hidden');
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



// ---------- Passwort vergessen ----------
function getPasswordResetUrl() {
    const basePath = location.pathname.replace(/\/[^\/]*$/, '/');
    return location.origin + basePath + 'passwort-zuruecksetzen.html';
}

function showForgotPassword() {
    const currentEmail = document.getElementById('login-email')?.value || '';
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Passwort zurücksetzen</h2>
            <p class="small-muted" style="margin:8px 0 12px">
                Gib deine registrierte E-Mail-Adresse ein. Du bekommst dann eine E-Mail mit einem Link zum Ändern deines Passworts.
            </p>
            <input id="reset-email" type="email" inputmode="email" autocomplete="email" class="form-input" placeholder="E-Mail-Adresse" value="${escapeHtml(currentEmail)}">
            <button id="reset-mail-btn" class="btn btn-primary" onclick="sendPasswordReset()">Reset-Link per E-Mail senden</button>
            <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('reset-email')?.focus(), 80);
}

async function sendPasswordReset() {
    let email = normalizeEmail(document.getElementById('reset-email')?.value || '');
    const btn = document.getElementById('reset-mail-btn');

    const emailCheck = validateEmailStrict(email);
    if (!emailCheck.valid) {
        showEmailValidationError(emailCheck.message);
        const input = document.getElementById('reset-email');
        if (input) input.focus();
        return;
    }
    email = emailCheck.email;

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Wird gesendet...';
    }

    try {
        await auth.sendPasswordResetEmail(email, {
            url: getPasswordResetUrl(),
            handleCodeInApp: true
        });
        document.querySelector('.modal-overlay')?.remove();
        showToast('E-Mail zum Zurücksetzen wurde gesendet.');
    } catch (err) {
        let msg = 'E-Mail konnte nicht gesendet werden.';
        if (err.code === 'auth/user-not-found') msg = 'Zu dieser E-Mail wurde kein Account gefunden.';
        if (err.code === 'auth/too-many-requests') msg = 'Zu viele Versuche. Bitte später erneut versuchen.';
        if (err.code === 'auth/invalid-email') msg = 'Diese E-Mail-Adresse ist ungültig.';
        showToast(msg);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Reset-Link per E-Mail senden';
        }
    }
}



// ---------- Passwort-Empfehlungen ----------
function getPasswordChecks(password) {
    const pw = String(password || '');
    return {
        length: pw.length >= 8,
        upper: /[A-ZÄÖÜ]/.test(pw),
        lower: /[a-zäöüß]/.test(pw),
        number: /[0-9]/.test(pw),
        special: /[^A-Za-zÄÖÜäöüß0-9]/.test(pw)
    };
}

function isStrongPassword(password) {
    const c = getPasswordChecks(password);
    return c.length && c.upper && c.lower && c.number && c.special;
}

function passwordHintMarkup(inputId) {
    return `<div class="password-hint" data-password-hint-for="${inputId}">
        <strong>Passwort sollte enthalten:</strong>
        <ul>
            <li data-check="length">Mindestens 8 Zeichen</li>
            <li data-check="upper">Mindestens 1 Großbuchstabe</li>
            <li data-check="lower">Mindestens 1 Kleinbuchstabe</li>
            <li data-check="number">Mindestens 1 Zahl</li>
            <li data-check="special">Mindestens 1 Sonderzeichen</li>
        </ul>
    </div>`;
}

function ensurePasswordHint(input) {
    if (!input || !input.id) return;
    let hint = document.querySelector(`[data-password-hint-for="${input.id}"]`);
    if (!hint) {
        input.insertAdjacentHTML('afterend', passwordHintMarkup(input.id));
        hint = document.querySelector(`[data-password-hint-for="${input.id}"]`);
    }
    updatePasswordHint(input);
}

function updatePasswordHint(input) {
    if (!input || !input.id) return;
    const hint = document.querySelector(`[data-password-hint-for="${input.id}"]`);
    if (!hint) return;

    const checks = getPasswordChecks(input.value);
    Object.keys(checks).forEach(key => {
        const li = hint.querySelector(`[data-check="${key}"]`);
        if (li) li.classList.toggle('valid', !!checks[key]);
    });

    hint.classList.toggle('complete', isStrongPassword(input.value));
}

function bindPasswordRecommendationFields(scope = document) {
    const fields = scope.querySelectorAll('#reg-password');
    fields.forEach(input => {
        if (input.__passwordHintBound) return;
        input.__passwordHintBound = true;
        input.setAttribute('autocomplete', 'new-password');
        input.addEventListener('focus', () => ensurePasswordHint(input));
        input.addEventListener('input', () => updatePasswordHint(input));
        input.addEventListener('blur', () => {
            const hint = document.querySelector(`[data-password-hint-for="${input.id}"]`);
            if (hint && !input.value) hint.classList.remove('complete');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => bindPasswordRecommendationFields());

const passwordHintObserver = new MutationObserver(() => bindPasswordRecommendationFields());
passwordHintObserver.observe(document.documentElement, { childList: true, subtree: true });

// ---------- E-Mail-Validierung ----------
const blockedEmailDomains = [
    'example.com', 'test.com', 'mailinator.com', 'tempmail.com',
    '10minutemail.com', 'guerrillamail.com', 'yopmail.com', 'trashmail.com'
];

const commonEmailDomainTypos = {
    'gmal.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmail.de': 'gmail.com',
    'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com',
    'web.d': 'web.de',
    'gmx.d': 'gmx.de'
};

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function validateEmailStrict(email) {
    const value = normalizeEmail(email);

    if (!value) return { valid: false, message: 'Bitte E-Mail-Adresse eingeben.' };
    if (value.length > 254) return { valid: false, message: 'Die E-Mail-Adresse ist zu lang.' };
    if (/\s/.test(value)) return { valid: false, message: 'Die E-Mail-Adresse darf keine Leerzeichen enthalten.' };

    const basicPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
    if (!basicPattern.test(value)) {
        return { valid: false, message: 'Bitte eine gültige E-Mail-Adresse eingeben, z. B. name@example.de.' };
    }

    const parts = value.split('@');
    if (parts.length !== 2) return { valid: false, message: 'Die E-Mail-Adresse darf nur ein @ enthalten.' };

    const local = parts[0];
    const domain = parts[1];

    if (!local || local.length > 64) return { valid: false, message: 'Der Teil vor dem @ ist ungültig oder zu lang.' };
    if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
        return { valid: false, message: 'Der Teil vor dem @ enthält ungültige Punkte.' };
    }

    if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
        return { valid: false, message: 'Die Domain der E-Mail-Adresse ist ungültig.' };
    }

    const tld = domain.split('.').pop();
    if (!tld || tld.length < 2 || !/^[a-z]+$/i.test(tld)) {
        return { valid: false, message: 'Die Endung der E-Mail-Adresse ist ungültig.' };
    }

    if (blockedEmailDomains.includes(domain)) {
        return { valid: false, message: 'Diese E-Mail-Domain ist nicht erlaubt.' };
    }

    if (commonEmailDomainTypos[domain]) {
        return { valid: false, message: 'Meintest du ' + local + '@' + commonEmailDomainTypos[domain] + '? Bitte E-Mail korrigieren.' };
    }

    return { valid: true, email: value };
}

function showEmailValidationError(message) {
    const existing = document.getElementById('email-validation-error');
    if (existing) existing.remove();

    const emailInput = document.getElementById('reg-email') || document.getElementById('login-email');
    if (!emailInput) {
        if (typeof showToast === 'function') showToast(message);
        return;
    }

    const div = document.createElement('div');
    div.id = 'email-validation-error';
    div.className = 'auth-error';
    div.textContent = message;
    emailInput.insertAdjacentElement('afterend', div);
    emailInput.focus();
}

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
        'auth/operation-not-allowed': 'E-Mail/Passwort-Login ist in Firebase nicht aktiviert.',
        'auth/admin-restricted-operation': 'Anonymes Login ist nicht aktiviert. Bitte in Firebase Console unter Authentication → Sign-in method → Anonymous aktivieren.'
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
                <input id="login-email" type="email" inputmode="email" autocomplete="email" class="form-input" placeholder="E-Mail" autocomplete="email" inputmode="email">
                <input id="login-password" type="password" class="form-input" placeholder="Passwort" autocomplete="current-password" onkeydown="if(event.key==='Enter') login()">
                <button id="login-button" class="btn btn-accent" onclick="login()">Anmelden</button>
                <button class="btn btn-outline" onclick="showRegister()" style="margin-top:8px">Registrieren</button>
                <div id="guest-login-section" style="margin-top:12px"></div>
                <p class="login-help">Falls der Login auf einem eigenen Server nicht funktioniert: Domain in Firebase Authentication → Settings → Authorized domains eintragen.</p>
            </div>
        </div>`;
    if (typeof updateThemeToggleButtons === 'function') updateThemeToggleButtons(document.body?.getAttribute('data-theme') || getSavedTheme());
    checkGuestAccess();
}

async function checkGuestAccess() {
    const section = document.getElementById('guest-login-section');
    if (!section) return;
    try {
        const snap = await db.collection('users').where('guestAccessEnabled', '==', true).limit(1).get({ source: 'server' });
        if (!snap.empty) {
            section.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                    <div style="flex:1;height:1px;background:var(--border)"></div>
                    <span class="small-muted" style="white-space:nowrap">oder</span>
                    <div style="flex:1;height:1px;background:var(--border)"></div>
                </div>
                <button class="btn btn-outline" onclick="loginAsGuest()" style="width:100%">
                    👤 Als Gast fortfahren
                </button>`;
        } else {
            section.innerHTML = '';
        }
    } catch (e) {
        section.innerHTML = '';
    }
}

async function loginAsGuest() {
    const btn = document.querySelector('#guest-login-section .btn');
    try {
        if (btn) { btn.disabled = true; btn.textContent = 'Wird angemeldet...'; }
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        await auth.signInAnonymously();
        showToast('Als Gast angemeldet');
    } catch (err) {
        showInlineAuthError(getAuthErrorMessage(err));
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '👤 Als Gast fortfahren'; }
    }
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
                <input id="reg-email" type="email" inputmode="email" autocomplete="email" class="form-input" placeholder="E-Mail" autocomplete="email" inputmode="email">
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
    const e = normalizeEmail(document.getElementById('login-email')?.value).trim();
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
    const e = normalizeEmail(document.getElementById('reg-email')?.value).trim();
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
        await r.user.sendEmailVerification().catch(() => {});
        await ensureUserProfile(r.user, { name: n, email: e, age });
        showToast('Registriert. Bitte E-Mail-Postfach prüfen.');
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
                if (user.isAnonymous) {
                    currentUser = { uid: user.uid, isAnonymous: true, name: 'Gast', email: null };
                } else {
                    currentUser = await ensureUserProfile(user);
                }
                afterSuccessfulAuth();
            } else {
                currentUser = null;
                viewedJobs = JSON.parse(localStorage.getItem('mf_viewed_guest') || '[]');
                document.getElementById('bottom-nav')?.classList.add('hidden');
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



// ---------- Passwort vergessen ----------
function getPasswordResetUrl() {
    const basePath = location.pathname.replace(/\/[^\/]*$/, '/');
    return location.origin + basePath + 'passwort-zuruecksetzen.html';
}

function showForgotPassword() {
    const currentEmail = document.getElementById('login-email')?.value || '';
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Passwort vergessen?</h2>
            <p class="small-muted" style="margin:8px 0 12px">
                Gib deine registrierte E-Mail-Adresse ein. Du bekommst dann eine E-Mail mit einem Link zum Ändern deines Passworts.
            </p>
            <input id="reset-email" type="email" inputmode="email" autocomplete="email" class="form-input" placeholder="E-Mail-Adresse" value="${escapeHtml(currentEmail)}">
            <button id="reset-mail-btn" class="btn btn-primary" onclick="sendPasswordReset()">Passwort-Link senden</button>
            <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Abbrechen</button>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('reset-email')?.focus(), 80);
}

async function sendPasswordReset() {
    let email = normalizeEmail(document.getElementById('reset-email')?.value || '');
    const btn = document.getElementById('reset-mail-btn');

    const emailCheck = validateEmailStrict(email);
    if (!emailCheck.valid) {
        showEmailValidationError(emailCheck.message);
        const input = document.getElementById('reset-email');
        if (input) input.focus();
        return;
    }
    email = emailCheck.email;

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Wird gesendet...';
    }

    try {
        await auth.sendPasswordResetEmail(email, {
            url: getPasswordResetUrl(),
            handleCodeInApp: true
        });
        document.querySelector('.modal-overlay')?.remove();
        showToast('E-Mail zum Zurücksetzen wurde gesendet.');
    } catch (err) {
        let msg = 'E-Mail konnte nicht gesendet werden.';
        if (err.code === 'auth/user-not-found') msg = 'Zu dieser E-Mail wurde kein Account gefunden.';
        if (err.code === 'auth/too-many-requests') msg = 'Zu viele Versuche. Bitte später erneut versuchen.';
        if (err.code === 'auth/invalid-email') msg = 'Diese E-Mail-Adresse ist ungültig.';
        showToast(msg);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Passwort-Link senden';
        }
    }
}



// ---------- Passwort-Empfehlungen ----------
function getPasswordChecks(password) {
    const pw = String(password || '');
    return {
        length: pw.length >= 8,
        upper: /[A-ZÄÖÜ]/.test(pw),
        lower: /[a-zäöüß]/.test(pw),
        number: /[0-9]/.test(pw),
        special: /[^A-Za-zÄÖÜäöüß0-9]/.test(pw)
    };
}

function isStrongPassword(password) {
    const c = getPasswordChecks(password);
    return c.length && c.upper && c.lower && c.number && c.special;
}

function passwordHintMarkup(inputId) {
    return `<div class="password-hint" data-password-hint-for="${inputId}">
        <strong>Passwort sollte enthalten:</strong>
        <ul>
            <li data-check="length">Mindestens 8 Zeichen</li>
            <li data-check="upper">Mindestens 1 Großbuchstabe</li>
            <li data-check="lower">Mindestens 1 Kleinbuchstabe</li>
            <li data-check="number">Mindestens 1 Zahl</li>
            <li data-check="special">Mindestens 1 Sonderzeichen</li>
        </ul>
    </div>`;
}

function ensurePasswordHint(input) {
    if (!input || !input.id) return;
    let hint = document.querySelector(`[data-password-hint-for="${input.id}"]`);
    if (!hint) {
        input.insertAdjacentHTML('afterend', passwordHintMarkup(input.id));
        hint = document.querySelector(`[data-password-hint-for="${input.id}"]`);
    }
    updatePasswordHint(input);
}

function updatePasswordHint(input) {
    if (!input || !input.id) return;
    const hint = document.querySelector(`[data-password-hint-for="${input.id}"]`);
    if (!hint) return;

    const checks = getPasswordChecks(input.value);
    Object.keys(checks).forEach(key => {
        const li = hint.querySelector(`[data-check="${key}"]`);
        if (li) li.classList.toggle('valid', !!checks[key]);
    });

    hint.classList.toggle('complete', isStrongPassword(input.value));
}

function bindPasswordRecommendationFields(scope = document) {
    const fields = scope.querySelectorAll('#reg-password, #new-password, #new-password-repeat, input[type="password"]');
    fields.forEach(input => {
        if (input.__passwordHintBound) return;
        input.__passwordHintBound = true;
        input.setAttribute('autocomplete', input.id === 'login-password' ? 'current-password' : 'new-password');
        input.addEventListener('focus', () => ensurePasswordHint(input));
        input.addEventListener('input', () => updatePasswordHint(input));
        input.addEventListener('blur', () => {
            const hint = document.querySelector(`[data-password-hint-for="${input.id}"]`);
            if (hint && !input.value) hint.classList.remove('complete');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => bindPasswordRecommendationFields());

const passwordHintObserver = new MutationObserver(() => bindPasswordRecommendationFields());
passwordHintObserver.observe(document.documentElement, { childList: true, subtree: true });
