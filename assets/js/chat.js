// ---------- CHAT ----------
function showChatsScreen() {
    updateHeader('chats');
    document.getElementById('main-content').innerHTML = '<div class="spinner"></div>';
    if (chatsUnsubscribe) chatsUnsubscribe();
    chatsUnsubscribe = db.collection('chats').where('participants', 'array-contains', currentUser.uid).orderBy('updatedAt','desc')
        .onSnapshot(snap => {
            if (snap.empty) {
                document.getElementById('main-content').innerHTML = '<div class="empty-state">Noch keine Chats</div>';
                return;
            }
            document.getElementById('main-content').innerHTML = snap.docs.map(d => {
                const c = d.data();
                return `<div class="card" onclick="navigateTo('chat','${d.id}')">
                    <strong>${escapeHtml(c.jobTitle || 'Chat')}</strong>
                    <p class="small-muted">${escapeHtml(c.lastMessage || 'Noch keine Nachricht')}</p>
                    <p class="small-muted">${formatDate(c.updatedAt)}</p>
                </div>`;
            }).join('');
        }, err => {
            document.getElementById('main-content').innerHTML = `<div class="empty-state">Chat-Fehler: ${escapeHtml(err.message)}</div>`;
        });
}
async function startChatForJob(jobId) {
    let job = null;
    if (isStratoBackend()) {
        job = await stratoGetJob(jobId).catch(err => { showToast('Job konnte nicht geladen werden: ' + err.message); return null; });
    } else {
        const jobDoc = await db.collection('jobs').doc(jobId).get();
        job = jobDoc.data();
    }
    if (!job) { showToast('Job nicht gefunden'); return; }
    if (job.createdBy === currentUser.uid) { showToast('Das ist dein eigener Job'); return; }
    const participants = [currentUser.uid, job.createdBy].sort();
    const existing = await db.collection('chats')
        .where('jobId','==',jobId)
        .where('participantsKey','==',participants.join('_'))
        .limit(1).get();
    if (!existing.empty) {
        navigateTo('chat', existing.docs[0].id);
        return;
    }
    const ref = await db.collection('chats').add({
        jobId,
        jobTitle: job.title,
        ownerId: job.createdBy,
        requesterId: currentUser.uid,
        participants,
        participantsKey: participants.join('_'),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessage: ''
    });
    navigateTo('chat', ref.id);
}
async function showChatScreen(chatId) {
    updateHeader('chat');
    document.getElementById('main-content').innerHTML = `
        <div class="chat-shell">
            <div id="chat-messages" class="chat-messages"><div class="spinner"></div></div>
            <div class="chat-input-bar">
                <input id="chat-input" class="form-input" style="margin:0" placeholder="Nachricht schreiben..." onkeydown="if(event.key==='Enter') sendChatMessage('${chatId}')">
                <button class="icon-circle" onclick="sendChatMessage('${chatId}')"><span class="material-icons">send</span></button>
            </div>
        </div>`;
    if (messagesUnsubscribe) messagesUnsubscribe();
    messagesUnsubscribe = db.collection('chats').doc(chatId).collection('messages').orderBy('createdAt','asc')
        .onSnapshot(snap => {
            const box = document.getElementById('chat-messages');
            if (!box) return;
            if (snap.empty) {
                box.innerHTML = '<div class="empty-state">Schreibe die erste Nachricht</div>';
                return;
            }
            box.innerHTML = snap.docs.map(d => {
                const m = d.data();
                const sent = m.senderId === currentUser.uid;
                return `<div class="msg-wrapper ${sent ? 'sent' : 'received'}">
                    <div class="msg-bubble ${sent ? 'sent' : 'received'}">${escapeHtml(m.text)}</div>
                    <div class="msg-time">${formatDate(m.createdAt)}</div>
                </div>`;
            }).join('');
            box.scrollTop = box.scrollHeight;
        });
}
async function sendChatMessage(chatId) {
    const input = document.getElementById('chat-input');
    const text = input?.value.trim();
    if (!text) return;
    input.value = '';
    await db.collection('chats').doc(chatId).collection('messages').add({
        text,
        senderId: currentUser.uid,
        senderName: currentUser.name || currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await db.collection('chats').doc(chatId).update({
        lastMessage: text,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}
