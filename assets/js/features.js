// ---------- ERWEITERTE FUNKTIONEN ----------
let currentSortMode = localStorage.getItem('mf_sort_mode') || 'newest';
let selectedMapCategories = new Set(JSON.parse(localStorage.getItem('mf_map_categories') || '[]'));
let mapTileMode = localStorage.getItem('mf_map_tile') || 'street';
let usersCache = {};
let deferredInstallPrompt = null;
let unreadUnsubscribe = null;

function getCustomCategories() {
    try { return JSON.parse(localStorage.getItem('mf_custom_categories') || '[]'); } catch(e) { return []; }
}
function saveCustomCategories(list) { localStorage.setItem('mf_custom_categories', JSON.stringify(list)); }
function getAllCategories() {
    const base = categories.filter(c => c !== 'Eigene...');
    const custom = getCustomCategories().filter(c => c && !base.includes(c));
    return [...base, ...custom, 'Eigene...'];
}
function getCategoryEmoji(cat) { return categoryEmoji[cat] || '🏷️'; }
function getCategoryColor(cat) { return categoryColor[cat] || '#64748B'; }
function getStatusLabel(status) {
    if (status === 'reserviert') return '🔒 Reserviert';
    if (status === 'erledigt') return '✓ Erledigt';
    return '✅ Offen';
}
function getStatusClass(status) {
    if (status === 'reserviert') return 'status-reserviert';
    if (status === 'erledigt') return 'status-done';
    return 'status-offen';
}
function getSetting(key, fallback) { return localStorage.getItem(key) ?? fallback; }
function setSetting(key, value) { localStorage.setItem(key, String(value)); }
function soundsEnabled() { return localStorage.getItem('mf_sounds') !== 'off'; }
function notificationsEnabled() { return localStorage.getItem('mf_notifications') !== 'off'; }
function playAppSound(type) {
    if (!soundsEnabled()) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.value = 0.18;
        const seq = type === 'message' ? [[1200,0],[1600,.12]] : type === 'send' ? [[1000,0],[600,.12]] : type === 'success' ? [[600,0],[800,.1],[1000,.2]] : [[800,0]];
        seq.forEach(([freq, offset]) => {
            const osc = ctx.createOscillator();
            osc.connect(gain); osc.type = 'sine'; osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);
            osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + .12);
        });
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + .45);
    } catch(e) {}
}
const oldShowToast = typeof showToast === 'function' ? showToast : null;
showToast = function(msg) { if (oldShowToast) oldShowToast(msg); playAppSound('toast'); };

function skeletonCards(count = 4) {
    return Array.from({length: count}).map(() => `<div class="card skeleton-card"><div></div><div></div><div></div></div>`).join('');
}
function sortDocsByCreated(items) {
    return items.sort((a,b) => {
        const ad = a.data.createdAt?.toMillis ? a.data.createdAt.toMillis() : (new Date(a.data.createdAt || 0).getTime());
        const bd = b.data.createdAt?.toMillis ? b.data.createdAt.toMillis() : (new Date(b.data.createdAt || 0).getTime());
        if (currentSortMode === 'distance' && userLocation) {
            const da = a.data.lat && a.data.lng ? calculateDistance(userLocation.lat,userLocation.lng,a.data.lat,a.data.lng) : 99999;
            const db = b.data.lat && b.data.lng ? calculateDistance(userLocation.lat,userLocation.lng,b.data.lat,b.data.lng) : 99999;
            return da - db;
        }
        return bd - ad;
    });
}
function radiusLabel() { return radiusFilter >= 9999 ? 'Alle' : `${radiusFilter} km`; }
function getRadiusOptionsHtml(selected = radiusFilter) {
    const opts = [...radiusOptions, 9999];
    return opts.map(r => `<option value="${r}" ${Number(selected) === r ? 'selected' : ''}>${r >= 9999 ? 'Alle' : r + ' km'}</option>`).join('');
}

// ---------- AUTH / ONBOARDING ----------
showRegister = function() {
    document.getElementById('main-content').innerHTML = `<div class="auth-screen">
        <button class="theme-toggle auth-theme-toggle" type="button" onclick="toggleTheme()" aria-label="Darkmode umschalten"><span class="material-icons">dark_mode</span></button>
        <div class="auth-card">
            <span class="auth-logo">💼</span><h2><span class="brand-gradient">Registrieren</span></h2>
            <div id="auth-error" class="auth-error hidden"></div>
            <input id="reg-name" class="form-input" placeholder="Name" autocomplete="name">
            <input id="reg-city" class="form-input" placeholder="Wohnort / Stadt" autocomplete="address-level2">
            <input id="reg-email" class="form-input" placeholder="E-Mail" autocomplete="email">
            <input id="reg-password" type="password" class="form-input" placeholder="Passwort" autocomplete="new-password">
            <input id="reg-birthdate" type="date" class="form-input">
            <div class="device-choice compact"><button onclick="setManualDevice('mobile')">Handy</button><button onclick="setManualDevice('tablet')">Tablet/iPad</button><button onclick="setManualDevice('desktop')">PC</button></div>
            <button id="register-button" class="btn btn-accent" onclick="register()">Registrieren</button>
            <button class="btn btn-outline" onclick="showLoginScreen()">Zurück</button>
        </div></div>`;
};
register = async function() {
    const n = document.getElementById('reg-name')?.value.trim();
    const city = document.getElementById('reg-city')?.value.trim();
    const e = document.getElementById('reg-email')?.value.trim();
    const p = document.getElementById('reg-password')?.value;
    const b = document.getElementById('reg-birthdate')?.value;
    const btn = document.getElementById('register-button');
    clearInlineAuthError();
    if (!n || !city || !e || !p || !b) { showInlineAuthError('Alle Felder ausfüllen.'); return; }
    const age = Math.floor((new Date() - new Date(b)) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 13) { showInlineAuthError('Du musst mindestens 13 Jahre alt sein.'); return; }
    try {
        if (btn) { btn.disabled = true; btn.textContent = 'Wird registriert...'; }
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const r = await auth.createUserWithEmailAndPassword(e, p);
        await ensureUserProfile(r.user, { name: n, email: e, age, city, bio: '', profileColor: '#2563EB' });
        localStorage.setItem('mf_city', city);
        showToast('Registriert'); playAppSound('success');
    } catch(err) { showInlineAuthError(getAuthErrorMessage(err)); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Registrieren'; } }
};
const oldAfterSuccessfulAuth = afterSuccessfulAuth;
afterSuccessfulAuth = function() {
    oldAfterSuccessfulAuth();
    startUnreadBadgeListener();
    setTimeout(() => maybeStartTutorial(), 800);
};

// ---------- JOBS ----------
showJobsScreen = function() {
    updateHeader('jobs');
    getPreciseLocation();
    const cats = getAllCategories();
    document.getElementById('main-content').innerHTML = `
        <div class="location-toolbar">
            <button class="location-pill" onclick="openLocationModal()">📍 ${escapeHtml(userLocation?.name || localStorage.getItem('mf_city') || 'Standort')} · ${radiusLabel()}</button>
            <select class="sort-select" onchange="currentSortMode=this.value;localStorage.setItem('mf_sort_mode',this.value);loadJobs()"><option value="newest" ${currentSortMode==='newest'?'selected':''}>Neueste</option><option value="distance" ${currentSortMode==='distance'?'selected':''}>Entfernung</option></select>
        </div>
        <div class="start-type-buttons"><div class="start-type-btn ${currentJobTypeFilter === 'offer' ? 'active' : ''}" onclick="setJobTypeFilter('offer')">Arbeit geben</div><div class="start-type-btn ${currentJobTypeFilter === 'seek' ? 'active' : ''}" onclick="setJobTypeFilter('seek')">Hilfe suchen</div><div class="start-type-btn ${currentJobTypeFilter === 'all' ? 'active' : ''}" onclick="setJobTypeFilter('all')">Alle</div></div>
        <input type="text" class="search-input" id="job-search" placeholder="🔍 Jobs suchen..." oninput="loadJobs()">
        <div class="filter-scroll">${cats.filter(c=>c!=='Eigene...').map(c => `<button class="filter-chip ${(c === 'Alle' && !selectedCategory) || c === selectedCategory ? 'active' : ''}" onclick="setCategory(this,'${c === 'Alle' ? '' : escapeJs(c)}')">${getCategoryEmoji(c)} ${escapeHtml(c)}</button>`).join('')}</div>
        <div id="jobs-list">${skeletonCards()}</div>`;
    loadJobs();
};
loadJobs = function() {
    if (jobsUnsubscribe) { jobsUnsubscribe(); jobsUnsubscribe = null; }
    if (isStratoBackend()) { loadJobsFromStrato(); return; }
    const list = document.getElementById('jobs-list');
    if (list) list.innerHTML = skeletonCards();
    // bewusst ohne komplexen Firestore-Index: Filtern/Sortieren clientseitig
    jobsUnsubscribe = db.collection('jobs').onSnapshot(snap => {
        let jobs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
        jobs = jobs.filter(item => ['offen','reserviert'].includes(item.data.status || 'offen'));
        if (selectedCategory && selectedCategory !== 'Eigene...') jobs = jobs.filter(item => item.data.category === selectedCategory);
        if (currentJobTypeFilter !== 'all') jobs = jobs.filter(item => item.data.jobType === currentJobTypeFilter);
        const s = document.getElementById('job-search')?.value?.toLowerCase() || '';
        if (s) jobs = jobs.filter(item => (item.data.title || '').toLowerCase().includes(s) || (item.data.description || '').toLowerCase().includes(s));
        if (userLocation && radiusFilter < 9999) jobs = jobs.filter(item => item.data.lat && item.data.lng && calculateDistance(userLocation.lat, userLocation.lng, item.data.lat, item.data.lng) <= radiusFilter);
        renderJobList(sortDocsByCreated(jobs));
    }, err => { if (list) list.innerHTML = `<div class="empty-state">Fehler beim Laden: ${escapeHtml(err.message)}</div>`; });
};
renderJobCard = function(id, j) {
    const dist = userLocation && j.lat && j.lng ? calculateDistance(userLocation.lat, userLocation.lng, j.lat, j.lng) : '?';
    const typeLabel = j.jobType === 'offer' ? 'Biete Hilfe' : 'Suche Hilfe';
    const color = getCategoryColor(j.category);
    return `<div class="card job-card" onclick="navigateTo('job-detail','${id}')">
        <div class="job-card-top"><strong>${escapeHtml(j.title)}${isAdmin() ? '<span class="admin-badge">Admin</span>' : ''}</strong><span class="job-category" style="--cat:${color}">${getCategoryEmoji(j.category)} ${escapeHtml(j.category)}</span></div>
        <div class="badge-line"><span class="job-type-badge">${typeLabel}</span><span class="status-badge ${getStatusClass(j.status)}">${getStatusLabel(j.status)}</span></div>
        <p class="job-desc">${escapeHtml((j.description || '').substring(0, 115))}${(j.description || '').length > 115 ? '...' : ''}</p>
        <div class="job-meta"><span>📍 ${escapeHtml(j.location)} (${dist} km)</span><span>💰 ${formatPayment(j.payment)}</span></div>
        <div class="view-count">👁 ${j.views || 0} Aufrufe</div>
    </div>`;
};
showCreateJobScreen = function() {
    updateHeader('create');
    const cats = getAllCategories().filter(c => c !== 'Alle');
    document.getElementById('main-content').innerHTML = `<div class="form-page"><h2>Job erstellen</h2>
        <div class="job-type-selector"><div class="type-option ${selectedJobType === 'offer' ? 'active' : ''}" onclick="selectJobType(event,'offer')">Ich biete Hilfe an</div><div class="type-option ${selectedJobType === 'seek' ? 'active' : ''}" onclick="selectJobType(event,'seek')">Ich suche Hilfe</div></div>
        <input id="job-title" class="form-input" placeholder="Titel">
        <select id="job-category" class="form-input" onchange="toggleCustomCategory()"><option value="">Kategorie</option>${cats.map(c => `<option value="${escapeHtml(c)}">${getCategoryEmoji(c)} ${escapeHtml(c)}</option>`).join('')}</select>
        <div id="custom-category-div" style="display:none"><input id="custom-category" class="form-input" placeholder="Eigene Kategorie"></div>
        <textarea id="job-description" class="form-textarea" placeholder="Beschreibung"></textarea>
        <input id="job-location" class="form-input" placeholder="Ort (Stadt)" value="${escapeHtml(userLocation?.name || localStorage.getItem('mf_city') || '')}">
        <input id="job-payment" type="number" min="0" step="0.5" class="form-input" placeholder="Betrag in €">
        <button class="btn btn-accent" onclick="createJob()">Veröffentlichen</button></div>`;
};
const oldCreateJob = createJob;
createJob = async function() {
    const ttl = document.getElementById('job-title')?.value.trim();
    let cat = document.getElementById('job-category')?.value;
    const customCat = document.getElementById('custom-category')?.value.trim();
    if (cat === 'Eigene...' && customCat) { cat = customCat; const list = getCustomCategories(); if (!list.includes(cat)) { list.push(cat); saveCustomCategories(list); } }
    const desc = document.getElementById('job-description')?.value.trim();
    const loc = document.getElementById('job-location')?.value.trim();
    const pay = document.getElementById('job-payment')?.value.trim();
    if (!ttl || !cat || !desc || !loc || !pay) { showToast('Alle Felder ausfüllen'); return; }
    const coords = await getRandomPointInCity(loc);
    await db.collection('jobs').add({ title:ttl, category:cat, description:desc, location:loc, payment:pay, lat:coords.lat, lng:coords.lng, createdBy:currentUser.uid, creatorName:currentUser.name, createdAt:firebase.firestore.FieldValue.serverTimestamp(), updatedAt:firebase.firestore.FieldValue.serverTimestamp(), status:'offen', views:0, viewedBy:{}, ratings:{}, archived:false, jobType:selectedJobType });
    showToast('Job erstellt'); playAppSound('success'); navigateTo('jobs');
};
showJobDetailScreen = async function(jobId) {
    updateHeader('job-detail');
    document.getElementById('main-content').innerHTML = '<div class="spinner"></div>';
    const ref = db.collection('jobs').doc(jobId); const doc = await ref.get().catch(err => null); const job = doc?.data();
    if (!job) { document.getElementById('main-content').innerHTML = '<div class="empty-state">Job nicht gefunden</div>'; return; }
    const viewKey = currentUser?.uid || 'guest';
    if (!job.viewedBy?.[viewKey] && currentUser?.uid !== job.createdBy) {
        await ref.update({ views: firebase.firestore.FieldValue.increment(1), [`viewedBy.${viewKey}`]: true }).catch(()=>{});
        job.views = (job.views || 0) + 1;
    }
    const isOwner = currentUser && currentUser.uid === job.createdBy; const canManage = isOwner || isAdmin();
    const dist = userLocation && job.lat && job.lng ? calculateDistance(userLocation.lat,userLocation.lng,job.lat,job.lng) : '?';
    document.getElementById('main-content').innerHTML = `<div class="detail-page"><div class="card detail-card" style="cursor:auto">
        <div class="detail-head"><h2>${escapeHtml(job.title)}</h2><span class="job-category" style="--cat:${getCategoryColor(job.category)}">${getCategoryEmoji(job.category)} ${escapeHtml(job.category)}</span></div>
        <div class="badge-line"><span class="job-type-badge">${job.jobType === 'offer' ? 'Biete Hilfe' : 'Suche Hilfe'}</span><span class="status-badge ${getStatusClass(job.status)}">${getStatusLabel(job.status)}</span></div>
        <p class="detail-desc">${escapeHtml(job.description)}</p>
        <div class="detail-grid"><p>📍 ${escapeHtml(job.location)} · ${dist} km</p><p>💰 ${formatPayment(job.payment)}</p><p>Von: ${escapeHtml(job.creatorName || 'Unbekannt')}</p><p>👁 ${job.views || 0} Aufrufe</p></div>
    </div>
    ${!isOwner ? `<button class="btn btn-accent" onclick="startChatForJob('${jobId}', true)">Jetzt bewerben</button><button class="btn btn-outline" onclick="startChatForJob('${jobId}')">Nachricht senden</button>` : ''}
    <button class="btn btn-outline" onclick="showMapForJob('${jobId}')">Auf Karte anzeigen</button>
    ${canManage ? `<button class="btn btn-primary" onclick="navigateTo('edit-job','${jobId}')">Bearbeiten</button><button class="btn btn-outline" onclick="toggleJobStatus('${jobId}', '${job.status === 'reserviert' ? 'offen' : 'reserviert'}')">${job.status === 'reserviert' ? 'Wieder öffnen' : 'Reservieren'}</button><button class="btn btn-outline" onclick="showCompleteJobModal('${jobId}')">Als erledigt markieren</button><button class="btn btn-danger" onclick="deleteJob('${jobId}')">Löschen</button>` : ''}</div>`;
};
toggleJobStatus = async function(jobId, status) { await db.collection('jobs').doc(jobId).update({ status, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); showToast(status === 'reserviert' ? 'Reserviert' : 'Wieder geöffnet'); showJobDetailScreen(jobId); };
function showCompleteJobModal(jobId) {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay" id="rating-modal"><div class="modal-content"><h3>Job abschließen</h3><p class="small-muted">Optional eine Bewertung vergeben.</p><div class="star-rating" id="rating-stars">${[1,2,3,4,5].map(i=>`<span class="star" onclick="setRatingValue(${i})">★</span>`).join('')}</div><textarea id="rating-text" class="form-textarea" placeholder="Kommentar optional"></textarea><button class="btn btn-accent" onclick="completeJob('${jobId}')">Abschließen</button><button class="btn btn-outline" onclick="document.getElementById('rating-modal').remove()">Abbrechen</button></div></div>`);
    window.currentRatingValue = 5; setRatingValue(5);
}
function setRatingValue(v) { window.currentRatingValue = v; document.querySelectorAll('#rating-stars .star').forEach((s,i)=>s.classList.toggle('active', i < v)); }
async function completeJob(jobId) {
    const doc = await db.collection('jobs').doc(jobId).get(); const job = doc.data();
    await db.collection('jobs').doc(jobId).update({ status:'erledigt', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await db.collection('ratings').add({ jobId, jobTitle: job?.title || '', ratedUserId: job?.createdBy || '', fromUserId: currentUser.uid, stars: window.currentRatingValue || 5, text: document.getElementById('rating-text')?.value.trim() || '', createdAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(()=>{});
    document.getElementById('rating-modal')?.remove(); showToast('Job abgeschlossen'); playAppSound('success'); navigateTo('job-detail', jobId);
}
function showMapForJob(jobId) { navigateTo('map', { focusJobId: jobId }); }
showMyJobs = async function() {
    updateHeader('my-jobs'); document.getElementById('main-content').innerHTML = skeletonCards();
    const snap = await db.collection('jobs').where('createdBy','==',currentUser.uid).get();
    const items = sortDocsByCreated(snap.docs.map(d => ({ id:d.id, data:d.data() })));
    const html = items.length ? items.map(i => renderJobCard(i.id,i.data)).join('') : '<div class="empty-state">Du hast noch keine Jobs erstellt</div>';
    document.getElementById('main-content').innerHTML = `<div id="jobs-list" style="padding-top:8px">${html}</div>`;
};
showRatingsScreen = async function() {
    updateHeader('ratings'); document.getElementById('main-content').innerHTML = '<div class="spinner"></div>';
    const snap = await db.collection('ratings').where('ratedUserId','==',currentUser.uid).get().catch(()=>null);
    const ratings = snap ? snap.docs.map(d=>d.data()) : [];
    const avg = ratings.length ? (ratings.reduce((a,r)=>a+(r.stars||0),0)/ratings.length).toFixed(1) : '0.0';
    document.getElementById('main-content').innerHTML = `<div class="card" style="text-align:center;cursor:auto"><h2>⭐ ${avg}</h2><p class="small-muted">${ratings.length} Bewertung(en)</p></div>${ratings.length ? ratings.map(r=>`<div class="card" style="cursor:auto"><strong>${'★'.repeat(r.stars||0)}${'☆'.repeat(5-(r.stars||0))}</strong><p>${escapeHtml(r.text || 'Keine Beschreibung')}</p><p class="small-muted">${escapeHtml(r.jobTitle || '')}</p></div>`).join('') : '<div class="empty-state">Noch keine Bewertungen</div>'}`;
};

// ---------- STANDORT ----------
function openLocationModal() {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay" id="location-modal"><div class="modal-content"><h3>Standort & Umkreis</h3><input id="manual-city" class="form-input" placeholder="Stadt" value="${escapeHtml(userLocation?.name || localStorage.getItem('mf_city') || '')}"><select id="manual-radius" class="form-input">${getRadiusOptionsHtml()}</select><button class="btn btn-accent" onclick="saveLocationSettings()">Speichern</button><button class="btn btn-outline" onclick="getPreciseLocation(()=>{document.getElementById('location-modal')?.remove();showJobsScreen();})">GPS erkennen</button><button class="btn btn-outline" onclick="document.getElementById('location-modal').remove()">Abbrechen</button></div></div>`);
}
async function saveLocationSettings() {
    const city = document.getElementById('manual-city').value.trim(); radiusFilter = parseInt(document.getElementById('manual-radius').value,10); localStorage.setItem('mf_radius', String(radiusFilter));
    if (city) { const coords = await getRandomPointInCity(city); userLocation = { ...coords, name: city }; localStorage.setItem('mf_location', JSON.stringify(userLocation)); localStorage.setItem('mf_city', city); }
    document.getElementById('location-modal')?.remove(); showToast('Standort gespeichert'); if (currentPage === 'jobs') showJobsScreen(); else if (currentPage === 'map') showMapScreen();
}

// ---------- MAP ----------
showMapScreen = function() {
    updateHeader('map');
    const cats = getAllCategories().filter(c => c !== 'Eigene...');
    document.getElementById('main-content').innerHTML = `<div class="map-actions"><button class="icon-pill" onclick="toggleMapFilters()"><span class="material-icons">tune</span> Filter</button><button class="icon-pill" onclick="openMapSearch()"><span class="material-icons">search</span> Ort</button><button class="icon-pill" onclick="getPreciseLocation(()=>showMapScreen())"><span class="material-icons">my_location</span></button><button class="icon-pill" onclick="switchMapTileMode()"><span class="material-icons">layers</span></button></div><div id="map-filter-bar" class="map-filter-bar closed"><div class="map-filters">${cats.map(c => `<label class="category-check"><input type="checkbox" ${selectedMapCategories.size===0 || selectedMapCategories.has(c) ? 'checked' : ''} onchange="toggleMapCategory('${escapeJs(c)}', this.checked)"> ${getCategoryEmoji(c)} ${escapeHtml(c)}</label>`).join('')}</div></div><div id="job-map" class="map-container"></div>`;
    setTimeout(initMap, 50);
};
function toggleMapCategory(cat, checked) { if (checked) selectedMapCategories.add(cat); else selectedMapCategories.delete(cat); localStorage.setItem('mf_map_categories', JSON.stringify([...selectedMapCategories])); initMap(); }
function switchMapTileMode() { mapTileMode = mapTileMode === 'street' ? 'satellite' : 'street'; localStorage.setItem('mf_map_tile', mapTileMode); showMapScreen(); }
function openMapSearch() { document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay" id="map-search-modal"><div class="modal-content"><h3>Ort suchen</h3><input id="map-search-city" class="form-input" placeholder="Stadt oder Adresse"><button class="btn btn-accent" onclick="searchMapCity()">Suchen</button><button class="btn btn-outline" onclick="document.getElementById('map-search-modal').remove()">Abbrechen</button></div></div>`); }
async function searchMapCity() { const city = document.getElementById('map-search-city').value.trim(); if (!city) return; const coords = await getRandomPointInCity(city); mapInstance?.flyTo([coords.lat, coords.lng], 13); document.getElementById('map-search-modal')?.remove(); }
initMap = async function() {
    const el = document.getElementById('job-map'); if (!el || !window.L) return;
    if (!userLocation) userLocation = { lat: 51.89, lng: 10.17, name:'Seesen' };
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    mapInstance = L.map('job-map', { zoomControl: false }).setView([userLocation.lat,userLocation.lng], 12);
    const street = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const sat = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    L.tileLayer(mapTileMode === 'satellite' ? sat : street, { maxZoom: 19, attribution: mapTileMode === 'satellite' ? '&copy; Esri' : '&copy; OpenStreetMap' }).addTo(mapInstance);
    mapMarkersLayer = L.layerGroup().addTo(mapInstance);
    L.marker([userLocation.lat,userLocation.lng]).addTo(mapMarkersLayer).bindPopup('Mein Standort');
    const snap = await db.collection('jobs').get();
    snap.docs.forEach(d => { const j = { id:d.id, ...d.data() }; if (!j.lat || !j.lng || !['offen','reserviert'].includes(j.status || 'offen')) return; if (selectedMapCategories.size && !selectedMapCategories.has(j.category)) return; if (radiusFilter < 9999 && calculateDistance(userLocation.lat,userLocation.lng,j.lat,j.lng) > radiusFilter) return; const icon = L.divIcon({ className:'job-map-pin', html:`<span style="background:${getCategoryColor(j.category)}">${getCategoryEmoji(j.category)}</span>`, iconSize:[34,34], iconAnchor:[17,17] }); L.marker([j.lat,j.lng], {icon}).addTo(mapMarkersLayer).bindPopup(`<strong>${escapeHtml(j.title)}</strong><br>${escapeHtml(j.category)}<br>${escapeHtml(j.location)}<br>${formatPayment(j.payment)}<br><button onclick="navigateTo('job-detail','${j.id}')">Details ansehen</button>`); });
};

// ---------- CHAT ----------
function getOtherParticipant(chat) { return (chat.participants || []).find(id => id !== currentUser.uid); }
async function getUserCached(uid) { if (!uid) return null; if (usersCache[uid]) return usersCache[uid]; const doc = await db.collection('users').doc(uid).get().catch(()=>null); usersCache[uid] = doc?.exists ? doc.data() : { name:'Nutzer' }; return usersCache[uid]; }
function formatRelative(ts) { if (!ts) return ''; const d = ts.toDate ? ts.toDate() : new Date(ts); const diff = Math.max(0, Date.now()-d.getTime()); const m = Math.floor(diff/60000); if (m<1) return 'Gerade eben'; if (m<60) return `${m}m`; const h = Math.floor(m/60); if (h<24) return `${h}h`; return `${Math.floor(h/24)}d`; }
showChatsScreen = function() {
    updateHeader('chats'); document.getElementById('main-content').innerHTML = '<div class="spinner"></div>'; if (chatsUnsubscribe) chatsUnsubscribe();
    chatsUnsubscribe = db.collection('chats').where('participants','array-contains',currentUser.uid).onSnapshot(async snap => {
        if (snap.empty) { document.getElementById('main-content').innerHTML = '<div class="empty-state">Noch keine Chats</div>'; return; }
        const chats = snap.docs.map(d => ({ id:d.id, data:d.data() })).sort((a,b)=>(b.data.updatedAt?.toMillis?.()||0)-(a.data.updatedAt?.toMillis?.()||0));
        const rows = await Promise.all(chats.map(async item => { const c = item.data; const other = await getUserCached(getOtherParticipant(c)); const unread = c.unreadCounts?.[currentUser.uid] || 0; return `<div class="card chat-row ${c.pinnedBy?.[currentUser.uid]?'pinned':''}" onclick="navigateTo('chat','${item.id}')"><div class="chat-avatar" style="background:${escapeHtml(other?.profileColor || '#2563EB')}">${escapeHtml((other?.name||'?').charAt(0).toUpperCase())}</div><div class="chat-row-main"><strong>${escapeHtml(other?.name || c.jobTitle || 'Chat')}</strong><p class="small-muted">${escapeHtml(c.jobTitle || '')}</p><p class="small-muted">${escapeHtml(c.lastMessage || 'Noch keine Nachricht')}</p></div><div class="chat-row-side"><span>${formatRelative(c.updatedAt)}</span>${unread ? `<b class="nav-badge">${unread}</b>` : ''}</div></div>`; }));
        document.getElementById('main-content').innerHTML = rows.join('');
    }, err => { document.getElementById('main-content').innerHTML = `<div class="empty-state">Chat-Fehler: ${escapeHtml(err.message)}</div>`; });
};
startChatForJob = async function(jobId, applyMessage = false) {
    const jobDoc = await db.collection('jobs').doc(jobId).get(); const job = jobDoc.data(); if (!job) { showToast('Job nicht gefunden'); return; } if (job.createdBy === currentUser.uid) { showToast('Das ist dein eigener Job'); return; }
    const participants = [currentUser.uid, job.createdBy].sort(); const key = participants.join('_');
    const existing = await db.collection('chats').where('jobId','==',jobId).where('participantsKey','==',key).limit(1).get(); let chatId;
    if (!existing.empty) chatId = existing.docs[0].id; else { const ref = await db.collection('chats').add({ jobId, jobTitle:job.title, ownerId:job.createdBy, requesterId:currentUser.uid, participants, participantsKey:key, createdAt:firebase.firestore.FieldValue.serverTimestamp(), updatedAt:firebase.firestore.FieldValue.serverTimestamp(), lastMessage:'', unreadCounts:{}, pinnedBy:{}, deletedFor:{} }); chatId = ref.id; }
    navigateTo('chat', chatId); if (applyMessage) setTimeout(()=>{ const inp=document.getElementById('chat-input'); if(inp && !inp.value) inp.value = `Hallo, ich möchte mich für „${job.title}“ bewerben.`; },400);
};
showChatScreen = async function(chatId) {
    updateHeader('chat'); await db.collection('chats').doc(chatId).update({ [`unreadCounts.${currentUser.uid}`]: 0, [`lastReadAt.${currentUser.uid}`]: firebase.firestore.FieldValue.serverTimestamp() }).catch(()=>{});
    document.getElementById('main-content').innerHTML = `<div class="chat-shell"><div class="chat-options"><button class="icon-pill" onclick="togglePinnedChat('${chatId}')">📌 Anpinnen</button><button class="icon-pill" onclick="markChatUnread('${chatId}')">📩 Ungelesen</button><button class="icon-pill" onclick="reportChat('${chatId}')">🚩 Melden</button><button class="icon-pill danger" onclick="deleteChatForMe('${chatId}')">🗑️ Löschen</button></div><div id="chat-messages" class="chat-messages"><div class="spinner"></div></div><div class="chat-input-bar"><input id="chat-input" class="form-input" style="margin:0" placeholder="Nachricht schreiben..." onkeydown="if(event.key==='Enter') sendChatMessage('${chatId}')"><button class="icon-circle" onclick="sendChatMessage('${chatId}')"><span class="material-icons">send</span></button></div></div>`;
    if (messagesUnsubscribe) messagesUnsubscribe(); messagesUnsubscribe = db.collection('chats').doc(chatId).collection('messages').orderBy('createdAt','asc').onSnapshot(snap => { const box=document.getElementById('chat-messages'); if(!box)return; if(snap.empty){ box.innerHTML='<div class="empty-state">Schreibe die erste Nachricht</div>'; return; } let inserted = false; box.innerHTML = snap.docs.map(d => { const m=d.data(); const sent=m.senderId===currentUser.uid; const sep = !sent && !inserted ? (inserted=true, '<div class="new-message-sep">Neue Nachrichten</div>') : ''; return `${sep}<div class="msg-wrapper ${sent?'sent':'received'}"><div class="msg-bubble ${sent?'sent':'received'}">${escapeHtml(m.text)}</div><div class="msg-time">${formatRelative(m.createdAt)}</div></div>`; }).join(''); box.scrollTop=box.scrollHeight; });
};
sendChatMessage = async function(chatId) { const input=document.getElementById('chat-input'); const text=input?.value.trim(); if(!text)return; input.value=''; const chatDoc=await db.collection('chats').doc(chatId).get(); const chat=chatDoc.data(); const others=(chat.participants||[]).filter(id=>id!==currentUser.uid); await db.collection('chats').doc(chatId).collection('messages').add({ text, senderId:currentUser.uid, senderName:currentUser.name||currentUser.email, createdAt:firebase.firestore.FieldValue.serverTimestamp() }); const upd={ lastMessage:text, updatedAt:firebase.firestore.FieldValue.serverTimestamp() }; others.forEach(uid => upd[`unreadCounts.${uid}`]=firebase.firestore.FieldValue.increment(1)); await db.collection('chats').doc(chatId).update(upd); playAppSound('send'); };
async function togglePinnedChat(chatId) { await db.collection('chats').doc(chatId).set({ pinnedBy:{ [currentUser.uid]: true } }, { merge:true }); showToast('Chat angepinnt'); }
async function markChatUnread(chatId) { await db.collection('chats').doc(chatId).update({ [`unreadCounts.${currentUser.uid}`]: firebase.firestore.FieldValue.increment(1) }); showToast('Als ungelesen markiert'); }
async function reportChat(chatId) { const reason = prompt('Warum möchtest du den Chat melden?'); if (!reason) return; await db.collection('reports').add({ chatId, reason, reporterId: currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); showToast('Meldung gesendet'); }
async function deleteChatForMe(chatId) { if (!confirm('Chat aus deiner Liste löschen?')) return; await db.collection('chats').doc(chatId).set({ deletedFor:{ [currentUser.uid]: true } }, { merge:true }); showToast('Chat ausgeblendet'); navigateTo('chats'); }
function startUnreadBadgeListener() { if (unreadUnsubscribe) unreadUnsubscribe(); if (!currentUser) return; unreadUnsubscribe = db.collection('chats').where('participants','array-contains',currentUser.uid).onSnapshot(snap => { let total=0; snap.docs.forEach(d=> total += d.data().unreadCounts?.[currentUser.uid] || 0); document.querySelectorAll('[data-page="chats"]').forEach(btn => { let b=btn.querySelector('.nav-badge'); if(total && !b){ b=document.createElement('b'); b.className='nav-badge'; btn.appendChild(b); } if(b) { b.textContent=total; b.style.display=total?'inline-flex':'none'; } }); }); }

// ---------- PROFIL / EINSTELLUNGEN ----------
showProfileScreen = async function() {
    updateHeader('profile');
    const jobsSnap = await db.collection('jobs').where('createdBy','==',currentUser.uid).get().catch(()=>null); const activeJobs = jobsSnap ? jobsSnap.docs.filter(d=>['offen','reserviert'].includes(d.data().status||'offen')).length : 0;
    const ratingsSnap = await db.collection('ratings').where('ratedUserId','==',currentUser.uid).get().catch(()=>null); const ratings = ratingsSnap ? ratingsSnap.docs.map(d=>d.data()) : []; const avg = ratings.length ? (ratings.reduce((a,r)=>a+(r.stars||0),0)/ratings.length).toFixed(1) : '0.0';
    const color = currentUser.profileColor || '#2563EB';
    document.getElementById('main-content').innerHTML = `<div class="profile-page"><div class="card profile-head" style="cursor:auto"><div class="profile-avatar" style="background:${escapeHtml(color)}">${escapeHtml((currentUser?.name || '?').charAt(0).toUpperCase())}</div><h2>${escapeHtml(currentUser?.name || '')}</h2><p class="small-muted">${escapeHtml(currentUser?.city || localStorage.getItem('mf_city') || '')}</p><p>${escapeHtml(currentUser?.bio || '')}</p>${isAdmin()?'<span class="admin-badge">Admin</span>':''}</div><div class="stats-grid"><div class="card"><strong>${activeJobs}</strong><span>Aktive Jobs</span></div><div class="card"><strong>⭐ ${avg}</strong><span>Bewertung</span></div><div class="card"><strong>${ratings.length}</strong><span>Anzahl</span></div></div><div class="card" onclick="navigateTo('my-jobs')"><strong>Meine Jobs</strong><p class="small-muted">Eigene Anzeigen verwalten</p></div><div class="card" onclick="navigateTo('ratings')"><strong>Bewertungen</strong><p class="small-muted">Bewertungen ansehen</p></div><div class="card" onclick="navigateTo('edit-profile')"><strong>Profil bearbeiten</strong></div><div class="card" onclick="navigateTo('settings')"><strong>Einstellungen</strong><p class="small-muted">Dark Mode, Sounds, Kategorien, Wohnort</p></div><button class="btn btn-danger" onclick="logout()">Abmelden</button></div>`;
};
editProfileScreen = function() {
    updateHeader('edit-profile'); const colors=['#2563EB','#EF4444','#F97316','#22C55E','#7C3AED','#EC4899','#0EA5E9','#14B8A6','#64748B','#111827'];
    document.getElementById('main-content').innerHTML = `<div class="form-page"><h2>Profil bearbeiten</h2><div class="profile-avatar live-avatar" id="live-avatar" style="background:${escapeHtml(currentUser.profileColor||'#2563EB')}">${escapeHtml((currentUser.name||'?').charAt(0).toUpperCase())}</div><input id="profile-name" class="form-input" value="${escapeHtml(currentUser?.name || '')}" placeholder="Name" oninput="document.getElementById('live-avatar').textContent=this.value.charAt(0).toUpperCase()||'?' "><input id="profile-city" class="form-input" value="${escapeHtml(currentUser?.city || localStorage.getItem('mf_city') || '')}" placeholder="Wohnort"><textarea id="profile-bio" class="form-textarea" placeholder="Bio">${escapeHtml(currentUser?.bio || '')}</textarea><div class="color-grid">${colors.map(c=>`<button class="color-dot" style="background:${c}" onclick="selectProfileColor('${c}')"></button>`).join('')}</div><input id="profile-color" type="hidden" value="${escapeHtml(currentUser.profileColor||'#2563EB')}"><button class="btn btn-accent" onclick="saveProfile()">Speichern</button></div>`;
};
function selectProfileColor(c){ document.getElementById('profile-color').value=c; document.getElementById('live-avatar').style.background=c; }
saveProfile = async function() { const payload={ name:document.getElementById('profile-name').value.trim(), city:document.getElementById('profile-city').value.trim(), bio:document.getElementById('profile-bio').value.trim(), profileColor:document.getElementById('profile-color').value }; if(!payload.name){showToast('Name eingeben');return;} await db.collection('users').doc(currentUser.uid).set(payload,{merge:true}); Object.assign(currentUser,payload); localStorage.setItem('mf_city', payload.city); showToast('Profil gespeichert'); navigateTo('profile'); };
showSettingsScreen = function() {
    updateHeader('settings'); const custom = getCustomCategories();
    document.getElementById('main-content').innerHTML = `<div class="settings-page"><h2>Einstellungen</h2><div class="settings-item"><span>Wohnort</span><button onclick="openLocationModal()">Ändern</button></div><div class="settings-item"><span>Suchradius</span><select onchange="updateRadius(this.value)">${getRadiusOptionsHtml()}</select></div><div class="settings-item"><span>Währung</span><select onchange="updateCurrency(this.value)">${Object.keys(currencySymbols).map(c => `<option value="${c}" ${c === currentCurrency ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="settings-item" onclick="toggleTheme()"><span>Dark Mode</span><span id="theme-status-text">${document.body?.getAttribute('data-theme') === 'dark' ? 'An' : 'Aus'}</span></div><div class="settings-item"><span>Sounds</span><label class="switch"><input type="checkbox" ${soundsEnabled()?'checked':''} onchange="localStorage.setItem('mf_sounds', this.checked?'on':'off')"><i></i></label></div><div class="settings-item"><span>Benachrichtigungen</span><label class="switch"><input type="checkbox" ${notificationsEnabled()?'checked':''} onchange="localStorage.setItem('mf_notifications', this.checked?'on':'off')"><i></i></label></div><div class="settings-block"><h3>Eigene Kategorien</h3><div class="inline-form"><input id="new-category" class="form-input" placeholder="z. B. Fotografie 📸"><button class="btn btn-accent" onclick="addCustomCategory()">Hinzufügen</button></div>${custom.map(c=>`<div class="settings-item"><span>${escapeHtml(c)}</span><button onclick="removeCustomCategory('${escapeJs(c)}')">Löschen</button></div>`).join('')}</div><button class="btn btn-outline" onclick="installPwa()">App installieren</button><button class="btn btn-outline" onclick="startTutorial(true)">Tutorial ansehen</button>${isAdmin()?'<button class="btn btn-outline" onclick="showAdminScreen()">Admin-Modus</button>':''}<button class="btn btn-outline" onclick="navigateTo('feedback')">Feedback senden</button><button class="btn btn-danger" onclick="deleteProfile()">Profil löschen</button></div>`;
};
function addCustomCategory(){ const v=document.getElementById('new-category').value.trim(); if(!v)return; const list=getCustomCategories(); if(!list.includes(v)) list.push(v); saveCustomCategories(list); showSettingsScreen(); }
function removeCustomCategory(c){ if(!confirm('Kategorie löschen?'))return; saveCustomCategories(getCustomCategories().filter(x=>x!==c)); showSettingsScreen(); }
async function deleteProfile(){ if(!confirm('Profil wirklich löschen?'))return; if(!confirm('Letzte Bestätigung: Konto und Profildaten löschen?'))return; await db.collection('users').doc(currentUser.uid).delete().catch(()=>{}); await auth.currentUser.delete().catch(()=>showToast('Bitte neu anmelden und nochmal löschen.')); }
async function showAdminScreen(){ updateHeader('admin'); const reports=await db.collection('reports').get().catch(()=>null); document.getElementById('main-content').innerHTML=`<div class="settings-page"><h2>Admin-Modus</h2><p class="small-muted">Vorbereitet für Admin-Funktionen.</p>${reports?reports.docs.map(d=>`<div class="card"><strong>Meldung</strong><p>${escapeHtml(d.data().reason)}</p><button class="btn btn-danger" onclick="db.collection('reports').doc('${d.id}').delete().then(()=>showAdminScreen())">Löschen</button></div>`).join(''):'<div class="empty-state">Keine Meldungen geladen</div>'}</div>`; }
showFeedbackScreen = function() { updateHeader('feedback'); document.getElementById('main-content').innerHTML = `<div class="form-page"><h2>Feedback</h2><select id="feedback-priority" class="form-input"><option>Niedrig</option><option>Mittel</option><option>Hoch</option></select><textarea id="feedback-text" class="form-textarea" placeholder="Was funktioniert nicht oder was soll verbessert werden?"></textarea><button class="btn btn-accent" onclick="sendFeedback()">Senden</button></div>`; };
sendFeedback = async function(){ const text=document.getElementById('feedback-text').value.trim(); if(!text){showToast('Text eingeben');return;} await db.collection('feedback').add({ text, priority:document.getElementById('feedback-priority').value, userId:currentUser.uid, email:currentUser.email, createdAt:firebase.firestore.FieldValue.serverTimestamp() }); showToast('Feedback gesendet'); navigateTo('profile'); };

// ---------- TUTORIAL / PWA / DEVICE ----------
function maybeStartTutorial(){ if(localStorage.getItem('mf_tutorial_done')!=='yes') startTutorial(false); }
function startTutorial(force){ if(force) localStorage.removeItem('mf_tutorial_done'); const steps=[['🏠 Navigation','Unten wechselst du zwischen Start, Karte, Neu, Chat und Profil.'],['💼 Filter','Wähle, ob du Arbeit geben oder Hilfe suchen möchtest.'],['🔍 Suche','Die Suche filtert Titel und Beschreibungen in Echtzeit.'],['🔥 Kategorien','Kategorien helfen beim schnellen Finden passender Jobs.'],['📍 Standort','Hier änderst du Stadt und Umkreis.'],['🗺️ Karte','Auf der Karte siehst du Jobs in deiner Umgebung.'],['✏️ Job erstellen','Über Neu erstellst du eine Anzeige.'],['💬 Chats','Hier findest du Bewerbungen und Nachrichten.'],['👤 Profil','Im Profil stehen Statistiken, Bewertungen und eigene Jobs.'],['⚙️ Einstellungen','Hier steuerst du Dark Mode, Sounds, Kategorien und Installation.']]; showTutorialStep(0, steps); }
function showTutorialStep(i, steps){ if(i>=steps.length){ localStorage.setItem('mf_tutorial_done','yes'); document.getElementById('tutorial-overlay')?.remove(); return; } document.getElementById('tutorial-overlay')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div id="tutorial-overlay" class="tutorial-overlay"><div class="tutorial-box"><h3>${steps[i][0]}</h3><p>${steps[i][1]}</p><div class="tutorial-progress">Schritt ${i+1}/${steps.length}</div><div class="tutorial-actions"><button class="btn btn-outline" onclick="localStorage.setItem('mf_tutorial_done','yes');document.getElementById('tutorial-overlay').remove()">Überspringen</button>${i>0?`<button class="btn btn-outline" onclick="showTutorialStep(${i-1}, window.__tutorialSteps)">Zurück</button>`:''}<button class="btn btn-accent" onclick="showTutorialStep(${i+1}, window.__tutorialSteps)">${i===steps.length-1?'Fertig':'Weiter'}</button></div></div></div>`); window.__tutorialSteps=steps; }
function setManualDevice(device){ localStorage.setItem('mf_manual_device', device); document.documentElement.setAttribute('data-device', device); document.body.setAttribute('data-device', device); showToast('Ansicht: '+device); }
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredInstallPrompt=e; setTimeout(()=>{ if(!localStorage.getItem('mf_install_hint')) { localStorage.setItem('mf_install_hint','yes'); showToast('Du kannst die App installieren.'); }},1000); });
async function installPwa(){ if(deferredInstallPrompt){ deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; } else showToast('Installation über Browser-Menü möglich.'); }
if ('serviceWorker' in navigator) { window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{})); }
