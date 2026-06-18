// ---------- Quality / Chat / Feedback / Badge Update ----------
let qualityNavigationLocked = false;
const qualityUserCache = window.qualityUserCache || (window.qualityUserCache = {});
const localDeletedChatsKey = () => currentUser ? `mf_deleted_chats_${currentUser.uid}` : 'mf_deleted_chats_guest';
const pinnedChatsKey = () => currentUser ? `mf_pinned_chats_${currentUser.uid}` : 'mf_pinned_chats_guest';

function qReadList(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
}
function qWriteList(key, list) {
    try { localStorage.setItem(key, JSON.stringify([...new Set(list)])); } catch (e) {}
}
function qIsDeletedChat(chatId) { return qReadList(localDeletedChatsKey()).includes(chatId); }
function qToggleLocalPinned(chatId) {
    const key = pinnedChatsKey();
    const list = qReadList(key);
    const exists = list.includes(chatId);
    const next = exists ? list.filter(id => id !== chatId) : [chatId, ...list];
    qWriteList(key, next);
    return !exists;
}
function qIsPinned(chatId, chatData = {}) {
    return !!chatData.pinnedBy?.[currentUser?.uid] || qReadList(pinnedChatsKey()).includes(chatId);
}
function qTimestampMs(value) {
    if (!value) return 0;
    if (value.toMillis) return value.toMillis();
    if (value.seconds) return value.seconds * 1000;
    const d = new Date(value).getTime();
    return Number.isFinite(d) ? d : 0;
}
async function qGetUser(uid) {
    if (!uid) return null;
    if (qualityUserCache[uid]) return qualityUserCache[uid];
    try {
        const doc = await db.collection('users').doc(uid).get();
        const data = doc.exists ? doc.data() : null;
        qualityUserCache[uid] = data || { name: 'Nutzer' };
        return qualityUserCache[uid];
    } catch (e) {
        return { name: 'Nutzer' };
    }
}
function qOtherParticipant(chat) {
    return (chat.participants || []).find(uid => uid !== currentUser?.uid);
}
function qPreviewName(chat, otherUser) {
    return otherUser?.name || chat.otherName || chat.jobTitle || 'Chat';
}
function qRenderChatMenu(chatId) {
    closeChatMenus();
    const menu = document.createElement('div');
    menu.className = 'chat-context-menu';
    menu.id = 'chat-menu-' + chatId;
    menu.innerHTML = `
        <button onclick="togglePinnedChat('${chatId}')"><span>📌</span> Anpinnen</button>
        <button onclick="markChatUnread('${chatId}')"><span>📩</span> Als ungelesen markieren</button>
        <button onclick="reportChat('${chatId}')"><span>🚩</span> Melden</button>
        <button class="danger" onclick="deleteChatForMe('${chatId}')"><span>🗑️</span> Löschen</button>
    `;
    document.body.appendChild(menu);
    const btn = document.querySelector(`[data-chat-menu="${chatId}"]`);
    if (btn) {
        const r = btn.getBoundingClientRect();
        menu.style.top = Math.min(window.innerHeight - menu.offsetHeight - 12, r.bottom + 6) + 'px';
        menu.style.left = Math.max(12, Math.min(window.innerWidth - 210, r.right - 200)) + 'px';
    }
    setTimeout(() => document.addEventListener('click', closeChatMenus, { once: true }), 0);
}
function closeChatMenus() {
    document.querySelectorAll('.chat-context-menu').forEach(m => m.remove());
}
function qSetChatPageClass(page) {
    document.body.classList.toggle('is-chat-open', page === 'chat');
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.classList.toggle('chat-hidden-nav', page === 'chat');
}
function qSetLoading(html = '<div class="spinner"></div>') {
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = html;
}

// Navigation wrapper: hide nav in private chat and avoid double click lag
if (typeof navigateTo === 'function' && !navigateTo.__qualityWrapped) {
    const oldNavigateTo = navigateTo;
    navigateTo = function(page, data = null, addToHistory = true) {
        if (qualityNavigationLocked) return;
        qualityNavigationLocked = true;
        qSetChatPageClass(page);
        requestAnimationFrame(() => {
            oldNavigateTo(page, data, addToHistory);
            qSetChatPageClass(page);
            setTimeout(() => { qualityNavigationLocked = false; }, 80);
        });
    };
    navigateTo.__qualityWrapped = true;
}

// Header wrapper: make footer/social links stay alive after render changes
if (typeof updateHeader === 'function' && !updateHeader.__qualityWrapped) {
    const oldUpdateHeader = updateHeader;
    updateHeader = function(page) {
        oldUpdateHeader(page);
        qSetChatPageClass(page);
        if (typeof ensureSocialFooter === 'function') setTimeout(ensureSocialFooter, 0);
    };
    updateHeader.__qualityWrapped = true;
}

// PWA Badge support
async function updateAppBadge(count) {
    const n = Math.max(0, Number(count) || 0);
    try {
        if ('setAppBadge' in navigator && 'clearAppBadge' in navigator) {
            if (n > 0) await navigator.setAppBadge(n);
            else await navigator.clearAppBadge();
        }
    } catch (e) {
        // Badging API is optional. Ignore unsupported platforms.
    }
}
function updateNavUnreadBadge(total) {
    document.querySelectorAll('[data-page="chats"]').forEach(btn => {
        let b = btn.querySelector('.nav-badge');
        if (total && !b) {
            b = document.createElement('b');
            b.className = 'nav-badge';
            btn.appendChild(b);
        }
        if (b) {
            b.textContent = total > 99 ? '99+' : String(total);
            b.style.display = total ? 'inline-flex' : 'none';
        }
    });
    updateAppBadge(total);
}
startUnreadBadgeListener = function() {
    if (unreadUnsubscribe) unreadUnsubscribe();
    if (!currentUser) return;
    unreadUnsubscribe = db.collection('chats')
        .where('participants','array-contains',currentUser.uid)
        .onSnapshot(snap => {
            let total = 0;
            snap.docs.forEach(d => {
                if (qIsDeletedChat(d.id)) return;
                total += Number(d.data().unreadCounts?.[currentUser.uid] || 0);
            });
            updateNavUnreadBadge(total);
        }, () => updateNavUnreadBadge(0));
};

// WhatsApp-like chat overview with 3-dot menu
showChatsScreen = function() {
    updateHeader('chats');
    qSetChatPageClass('chats');
    qSetLoading('<div class="chat-list-skeleton">' + skeletonCards(5) + '</div>');

    if (chatsUnsubscribe) chatsUnsubscribe();
    chatsUnsubscribe = db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .onSnapshot(async snap => {
            const docs = snap.docs
                .filter(d => !qIsDeletedChat(d.id) && !d.data().deletedFor?.[currentUser.uid])
                .map(d => ({ id: d.id, data: d.data() }))
                .sort((a,b) => {
                    const pinDiff = Number(qIsPinned(b.id, b.data)) - Number(qIsPinned(a.id, a.data));
                    if (pinDiff) return pinDiff;
                    return qTimestampMs(b.data.updatedAt) - qTimestampMs(a.data.updatedAt);
                });

            if (!docs.length) {
                document.getElementById('main-content').innerHTML = '<div class="empty-state">Noch keine Chats</div>';
                return;
            }

            const rows = await Promise.all(docs.map(async item => {
                const c = item.data;
                const otherUid = qOtherParticipant(c);
                const other = await qGetUser(otherUid);
                const unread = Number(c.unreadCounts?.[currentUser.uid] || 0);
                const pinned = qIsPinned(item.id, c);
                const initial = escapeHtml((qPreviewName(c, other).charAt(0) || 'C').toUpperCase());
                return `<div class="card chat-row ${pinned ? 'pinned' : ''}" onclick="navigateTo('chat','${item.id}')">
                    <div class="chat-avatar" style="background:${escapeHtml(other?.profileColor || '#2563EB')}">${initial}</div>
                    <div class="chat-row-main">
                        <div class="chat-title-line"><strong>${escapeHtml(qPreviewName(c, other))}</strong>${pinned ? '<span class="pinned-mini">📌</span>' : ''}</div>
                        <p class="small-muted">${escapeHtml(c.jobTitle || '')}</p>
                        <p class="small-muted">${escapeHtml(c.lastMessage || 'Noch keine Nachricht')}</p>
                    </div>
                    <div class="chat-row-side">
                        <span>${formatRelative(c.updatedAt)}</span>
                        ${unread ? `<b class="nav-badge">${unread > 99 ? '99+' : unread}</b>` : ''}
                        <button class="chat-menu-btn" data-chat-menu="${item.id}" onclick="event.stopPropagation(); qRenderChatMenu('${item.id}')" aria-label="Chat-Menü">⋮</button>
                    </div>
                </div>`;
            }));
            document.getElementById('main-content').innerHTML = `<div class="chat-list-page">${rows.join('')}</div>`;
        }, err => {
            document.getElementById('main-content').innerHTML = `<div class="empty-state">Chat-Fehler: ${escapeHtml(err.message)}</div>`;
        });
};

async function qMarkChatRead(chatId) {
    try {
        await db.collection('chats').doc(chatId).update({
            [`unreadCounts.${currentUser.uid}`]: 0,
            [`lastReadAt.${currentUser.uid}`]: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {}
}

// Chat detail: hide bottom nav, scroll to first unread once, then mark read
showChatScreen = async function(chatId) {
    updateHeader('chat');
    qSetChatPageClass('chat');

    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get().catch(() => null);
    const chat = chatSnap?.exists ? chatSnap.data() : {};
    const lastReadMs = qTimestampMs(chat.lastReadAt?.[currentUser.uid]);
    const unreadBeforeOpen = Number(chat.unreadCounts?.[currentUser.uid] || 0);
    const unreadSessionKey = `mf_unread_seen_${currentUser.uid}_${chatId}_${qTimestampMs(chat.updatedAt)}`;
    const shouldScrollToUnread = unreadBeforeOpen > 0 && !sessionStorage.getItem(unreadSessionKey);

    document.getElementById('main-content').innerHTML = `
        <div class="chat-shell chat-shell-private">
            <div id="chat-messages" class="chat-messages"><div class="spinner"></div></div>
            <div class="chat-input-bar">
                <input id="chat-input" class="form-input" style="margin:0" placeholder="Nachricht schreiben..." onkeydown="if(event.key==='Enter') sendChatMessage('${chatId}')">
                <button class="icon-circle" onclick="sendChatMessage('${chatId}')" aria-label="Senden"><span class="material-icons">send</span></button>
            </div>
        </div>`;

    if (messagesUnsubscribe) messagesUnsubscribe();
    let firstRender = true;

    messagesUnsubscribe = chatRef.collection('messages').orderBy('createdAt','asc')
        .onSnapshot(snap => {
            const box = document.getElementById('chat-messages');
            if (!box) return;
            if (snap.empty) {
                box.innerHTML = '<div class="empty-state">Schreibe die erste Nachricht</div>';
                qMarkChatRead(chatId);
                return;
            }

            let unreadInserted = false;
            const html = [];
            snap.docs.forEach(d => {
                const m = d.data();
                const sent = m.senderId === currentUser.uid;
                const createdMs = qTimestampMs(m.createdAt);
                const isUnreadMessage = !sent && shouldScrollToUnread && createdMs > lastReadMs;
                if (isUnreadMessage && !unreadInserted) {
                    html.push(`<div id="first-unread-marker" class="new-message-sep whatsapp-unread-sep"><span>Ungelesene Nachrichten</span></div>`);
                    unreadInserted = true;
                }
                html.push(`<div class="msg-wrapper ${sent ? 'sent' : 'received'}">
                    <div class="msg-bubble ${sent ? 'sent' : 'received'}">${escapeHtml(m.text)}</div>
                    <div class="msg-time">${formatDate(m.createdAt)}</div>
                </div>`);
            });

            box.innerHTML = html.join('');
            if (firstRender && shouldScrollToUnread && unreadInserted) {
                const marker = document.getElementById('first-unread-marker');
                if (marker) marker.scrollIntoView({ block: 'center' });
                sessionStorage.setItem(unreadSessionKey, '1');
            } else {
                box.scrollTop = box.scrollHeight;
            }

            firstRender = false;
            qMarkChatRead(chatId);
        }, err => {
            const box = document.getElementById('chat-messages');
            if (box) box.innerHTML = `<div class="empty-state">Nachrichten-Fehler: ${escapeHtml(err.message)}</div>`;
        });
};

sendChatMessage = async function(chatId) {
    const input = document.getElementById('chat-input');
    const text = input?.value.trim();
    if (!text) return;
    input.value = '';

    const chatRef = db.collection('chats').doc(chatId);
    const snap = await chatRef.get();
    const chat = snap.exists ? snap.data() : {};
    const others = (chat.participants || []).filter(uid => uid !== currentUser.uid);

    await chatRef.collection('messages').add({
        text,
        senderId: currentUser.uid,
        senderName: currentUser.name || currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const upd = {
        lastMessage: text,
        lastSenderId: currentUser.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    others.forEach(uid => upd[`unreadCounts.${uid}`] = firebase.firestore.FieldValue.increment(1));
    upd[`unreadCounts.${currentUser.uid}`] = 0;
    await chatRef.set(upd, { merge: true });
    if (typeof playAppSound === 'function') playAppSound('send');
};

togglePinnedChat = async function(chatId) {
    const nowPinned = qToggleLocalPinned(chatId);
    try {
        await db.collection('chats').doc(chatId).set({ pinnedBy: { [currentUser.uid]: nowPinned } }, { merge: true });
    } catch (e) {}
    closeChatMenus();
    showToast(nowPinned ? 'Chat angepinnt' : 'Chat gelöst');
    showChatsScreen();
};

markChatUnread = async function(chatId) {
    try {
        await db.collection('chats').doc(chatId).set({
            unreadCounts: { [currentUser.uid]: 1 }
        }, { merge: true });
        showToast('Als ungelesen markiert');
    } catch (e) {
        showToast('Konnte nicht markiert werden');
    }
    closeChatMenus();
};

reportChat = async function(chatId) {
    const reason = prompt('Warum möchtest du den Chat melden?');
    if (!reason) return;
    try {
        await db.collection('reports').add({
            type: 'chat',
            chatId,
            reason,
            reporterId: currentUser.uid,
            reporterEmail: currentUser.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'offen'
        });
        showToast('Meldung gesendet');
    } catch (e) {
        showToast('Meldung konnte nicht gesendet werden');
    }
    closeChatMenus();
};

deleteChatForMe = async function(chatId) {
    if (!confirm('Chat aus deiner Liste löschen?')) return;
    qWriteList(localDeletedChatsKey(), [...qReadList(localDeletedChatsKey()), chatId]);
    try {
        await db.collection('chats').doc(chatId).set({ deletedFor: { [currentUser.uid]: true } }, { merge: true });
    } catch (e) {}
    closeChatMenus();
    showToast('Chat ausgeblendet');
    navigateTo('chats');
};

// Feedback repair with validation, metadata and fallback
showFeedbackScreen = function() {
    updateHeader('feedback');
    document.getElementById('main-content').innerHTML = `<div class="form-page feedback-page">
        <div class="card" style="cursor:auto">
            <h2>Feedback an Admin senden</h2>
            <p class="small-muted">Beschreibe den Fehler oder deinen Vorschlag möglichst genau.</p>
            <select id="feedback-type" class="form-input">
                <option value="Fehler">Fehler melden</option>
                <option value="Verbesserung">Verbesserungsvorschlag</option>
                <option value="Sonstiges">Sonstiges</option>
            </select>
            <textarea id="feedback-text" class="form-textarea" placeholder="Was funktioniert nicht oder was soll verbessert werden?"></textarea>
            <button id="feedback-send-btn" class="btn btn-accent" onclick="sendFeedback()">Feedback senden</button>
        </div>
    </div>`;
};

sendFeedback = async function() {
    const text = document.getElementById('feedback-text')?.value.trim();
    const type = document.getElementById('feedback-type')?.value || 'Sonstiges';
    const btn = document.getElementById('feedback-send-btn');
    if (!text || text.length < 5) { showToast('Bitte Feedback genauer beschreiben'); return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Wird gesendet...'; }

    const payload = {
        type,
        text,
        userId: currentUser?.uid || null,
        email: currentUser?.email || null,
        name: currentUser?.name || null,
        page: currentPage,
        userAgent: navigator.userAgent,
        url: location.href,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'offen',
        priority: 'normal'
    };

    try {
        await db.collection('feedback').add(payload);
        showToast('Feedback gesendet');
        navigateTo('profile');
    } catch (err) {
        try {
            await db.collection('reports').add({ ...payload, type: 'feedback', originalType: type, error: err.message || String(err) });
            showToast('Feedback als Meldung gesendet');
            navigateTo('profile');
        } catch (err2) {
            const local = JSON.parse(localStorage.getItem('mf_feedback_outbox') || '[]');
            local.push({ ...payload, createdAt: new Date().toISOString(), firestoreError: err.message || String(err2) });
            localStorage.setItem('mf_feedback_outbox', JSON.stringify(local));
            showToast('Feedback lokal gespeichert. Firestore-Regeln prüfen.');
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Feedback senden'; }
    }
};

// Faster profile: render immediately, then fill stats asynchronously
showProfileScreen = function() {
    updateHeader('profile');
    const name = currentUser?.name || '';
    const city = currentUser?.city || localStorage.getItem('mf_city') || '';
    document.getElementById('main-content').innerHTML = `<div class="profile-page">
        <div class="card profile-head" style="cursor:auto">
            <div class="profile-avatar" style="background:${escapeHtml(currentUser?.profileColor || 'linear-gradient(135deg, var(--primary-blue), var(--accent-orange))')}">${escapeHtml((name || '?').charAt(0).toUpperCase())}</div>
            <h2>${escapeHtml(name)}</h2>
            <p class="small-muted">${escapeHtml(city)}</p>
            <p>${escapeHtml(currentUser?.bio || '')}</p>
            ${isAdmin() ? '<span class="admin-badge">Admin</span>' : ''}
        </div>
        <div class="stats-grid">
            <div class="card"><strong id="profile-active-jobs">…</strong><span>Aktive Jobs</span></div>
            <div class="card"><strong id="profile-rating">⭐ …</strong><span>Bewertung</span></div>
            <div class="card"><strong id="profile-rating-count">…</strong><span>Anzahl</span></div>
        </div>
        <div class="card" onclick="navigateTo('my-jobs')"><strong>Meine Jobs</strong><p class="small-muted">Eigene Anzeigen verwalten</p></div>
        <div class="card" onclick="navigateTo('ratings')"><strong>Bewertungen</strong><p class="small-muted">Bewertungen ansehen</p></div>
        <div class="card" onclick="navigateTo('settings')"><strong>Einstellungen</strong><p class="small-muted">Datenschutz, Cookies, Design, Feedback</p></div>
        <div class="card" onclick="navigateTo('edit-profile')"><strong>Profil bearbeiten</strong></div>
        <button class="btn btn-danger" onclick="logout()">Abmelden</button>
    </div>`;

    Promise.all([
        db.collection('jobs').where('createdBy','==',currentUser.uid).get().catch(() => null),
        db.collection('ratings').where('toUserId','==',currentUser.uid).get().catch(() => null)
    ]).then(([jobsSnap, ratingsSnap]) => {
        const activeJobs = jobsSnap ? jobsSnap.docs.filter(d => ['offen','reserviert'].includes(d.data().status || 'offen')).length : 0;
        const ratings = ratingsSnap ? ratingsSnap.docs.map(d => d.data().stars || d.data().rating || 0).filter(Boolean) : [];
        const avg = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1) : '0.0';
        const a = document.getElementById('profile-active-jobs');
        const r = document.getElementById('profile-rating');
        const c = document.getElementById('profile-rating-count');
        if (a) a.textContent = activeJobs;
        if (r) r.textContent = '⭐ ' + avg;
        if (c) c.textContent = ratings.length;
    });
};

// Better settings with required links
showSettingsScreen = function() {
    updateHeader('settings');
    document.getElementById('main-content').innerHTML = `<div class="settings-page">
        <h2>Einstellungen</h2>
        <div class="card" style="cursor:auto">
            <div class="settings-item"><span>Suchradius</span><select onchange="updateRadius(this.value)">${[...radiusOptions, 9999].map(r => `<option value="${r}" ${r === radiusFilter ? 'selected' : ''}>${r >= 9999 ? 'Alle' : r + ' km'}</option>`).join('')}</select></div>
            <div class="settings-item"><span>Währung</span><select onchange="updateCurrency(this.value)">${Object.keys(currencySymbols).map(c => `<option value="${c}" ${c === currentCurrency ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <div class="settings-item" onclick="toggleTheme()"><span>Design</span><span><span id="theme-status-text">${document.body?.getAttribute('data-theme') === 'dark' ? 'Darkmode' : 'Hellmodus'}</span> <span class="material-icons" style="vertical-align:middle;font-size:18px">contrast</span></span></div>
            <div class="settings-item" onclick="openCookieSettings()"><span>🍪 Cookies & Speicher</span><span>Ändern</span></div>
            <div class="settings-item" onclick="navigateTo('feedback')"><span>Feedback senden</span><span>›</span></div>
            <div class="settings-item" onclick="window.open('datenschutz.html','_blank')"><span>🔐 Datenschutzerklärung</span><span>Öffnen</span></div>
            <div class="settings-item" onclick="window.open('impressum.html','_blank')"><span>ℹ️ Impressum</span><span>Öffnen</span></div>
            <div class="settings-item danger-link" onclick="deleteMyAccount()"><span>🗑️ Account löschen</span><span>Löschen</span></div>
        </div>
    </div>`;
};

// Re-apply social links after route rendering
document.addEventListener('click', (e) => {
    if (!e.target.closest('.chat-context-menu') && !e.target.closest('.chat-menu-btn')) closeChatMenus();
});
