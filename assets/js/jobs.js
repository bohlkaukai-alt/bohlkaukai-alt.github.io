// ---------- JOB-LISTE ----------
function showJobsScreen() {
    updateHeader('jobs');
    getPreciseLocation();
    selectedCategory = selectedCategory || null;
    document.getElementById('main-content').innerHTML = `
        <div style="display:flex; gap:8px; padding:10px 14px 6px; align-items:center;">
            <button class="icon-circle" style="flex-shrink:0;" onclick="openLocationModal ? openLocationModal() : refreshMyLocation()" title="Ort suchen">
                <span class="material-icons">search</span>
            </button>
            <div class="start-type-buttons" style="flex:1; margin:0; padding:4px;">
                <div class="start-type-btn ${currentJobTypeFilter === 'offer' ? 'active' : ''}" style="font-size:11px; padding:7px 4px;" onclick="setJobTypeFilter('offer')">Arbeit geben</div>
                <div class="start-type-btn ${currentJobTypeFilter === 'seek' ? 'active' : ''}" style="font-size:11px; padding:7px 4px;" onclick="setJobTypeFilter('seek')">Hilfe suchen</div>
                <div class="start-type-btn ${currentJobTypeFilter === 'all' ? 'active' : ''}" style="font-size:11px; padding:7px 4px;" onclick="setJobTypeFilter('all')">Alle</div>
            </div>
            <select class="sort-select" style="min-width:100px; height:38px; font-size:13px; flex-shrink:0;" onchange="setSortOrder ? setSortOrder(this.value) : null">
                <option value="newest">Neueste</option>
                <option value="distance">Entfernung</option>
            </select>
        </div>
        <div style="display:flex; gap:8px; padding:0 14px 10px; align-items:center;">
            <div class="filter-scroll" style="flex:1; padding:0; margin:0;">${categories.map(c => `<button class="filter-chip ${(c === 'Alle' && !selectedCategory) || c === selectedCategory ? 'active' : ''}" onclick="setCategory(this,'${c === 'Alle' ? '' : escapeJs(c)}')">${escapeHtml(c)}</button>`).join('')}</div>
            <button class="location-pill" style="flex-shrink:0; white-space:nowrap; font-size:12px; padding:8px 10px; max-width:140px; overflow:hidden; text-overflow:ellipsis;" onclick="openLocationModal ? openLocationModal() : refreshMyLocation()">
                📍 ${escapeHtml(userLocation?.address || userLocation?.name || 'Ort')}${userLocation?.accuracy ? ' · ' + userLocation.accuracy + 'm' : ''}
            </button>
        </div>
        <div id="jobs-list"><div class="spinner"></div></div>`;
    loadJobs();
}
function setJobTypeFilter(type) { currentJobTypeFilter = type; showJobsScreen(); }
function setCategory(btn, cat) {
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    selectedCategory = cat || null;
    loadJobs();
}
function loadJobs() {
    if (jobsUnsubscribe) { jobsUnsubscribe(); jobsUnsubscribe = null; }
    if (isStratoBackend()) {
        loadJobsFromStrato();
        return;
    }
    let query = db.collection('jobs').where('status', 'in', ['offen','reserviert']).orderBy('createdAt','desc');
    if (selectedCategory && selectedCategory !== 'Eigene...') query = query.where('category','==', selectedCategory);
    jobsUnsubscribe = query.onSnapshot(snap => {
        let jobs = snap.docs;
        if (currentJobTypeFilter !== 'all') jobs = jobs.filter(d => d.data().jobType === currentJobTypeFilter);
        const s = document.getElementById('job-search')?.value?.toLowerCase() || '';
        if (s) jobs = jobs.filter(d => (d.data().title || '').toLowerCase().includes(s) || (d.data().description || '').toLowerCase().includes(s));
        if (userLocation) {
            jobs = jobs.filter(d => {
                const j = d.data();
                return j.lat && j.lng && calculateDistance(userLocation.lat, userLocation.lng, j.lat, j.lng) <= radiusFilter;
            });
        }
        renderJobList(jobs.map(d => ({ id: d.id, data: d.data() })));
    }, err => {
        const list = document.getElementById('jobs-list');
        if (list) list.innerHTML = `<div class="empty-state">Fehler beim Laden: ${escapeHtml(err.message)}</div>`;
    });
}

async function loadJobsFromStrato() {
    const list = document.getElementById('jobs-list');
    if (list) list.innerHTML = '<div class="spinner"></div>';
    try {
        const s = document.getElementById('job-search')?.value?.trim() || '';
        const filters = {};
        if (selectedCategory && selectedCategory !== 'Eigene...') filters.category = selectedCategory;
        if (currentJobTypeFilter !== 'all') filters.jobType = currentJobTypeFilter;
        if (s) filters.search = s;
        let jobs = await stratoListJobs(filters);
        if (userLocation) {
            jobs = jobs.filter(j => j.lat && j.lng && calculateDistance(userLocation.lat, userLocation.lng, j.lat, j.lng) <= radiusFilter);
        }
        renderJobList(jobs.map(j => ({ id: j.id, data: j })));
    } catch (err) {
        if (list) list.innerHTML = `<div class="empty-state">STRATO-Datenbankfehler: ${escapeHtml(err.message)}</div>`;
    }
}

function renderJobList(items) {
    const list = document.getElementById('jobs-list');
    if (!list) return;
    if (!items.length) {
        list.innerHTML = `<div class="empty-state">Keine Jobs gefunden</div>`;
        return;
    }
    list.innerHTML = items.map(item => renderJobCard(item.id, item.data)).join('');
}

function renderJobCard(id, j) {
    const dist = userLocation && j.lat && j.lng ? calculateDistance(userLocation.lat, userLocation.lng, j.lat, j.lng) : '?';
    const typeLabel = j.jobType === 'offer' ? 'Biete Hilfe' : 'Suche Hilfe';
    return `<div class="card" onclick="navigateTo('job-detail','${id}')">
        <div style="display:flex;justify-content:space-between;gap:8px">
            <strong>${escapeHtml(j.title)}${isAdmin() ? '<span class="admin-badge">Admin</span>' : ''}</strong>
            <span class="job-category">${escapeHtml(j.category)}</span>
        </div>
        <div class="badge-line"><span class="job-type-badge">${typeLabel}</span>${j.status === 'reserviert' ? '<span class="status-badge status-reserviert">Reserviert</span>' : ''}</div>
        <p style="font-size:12px">${escapeHtml((j.description || '').substring(0, 100))}${(j.description || '').length > 100 ? '...' : ''}</p>
        <div style="display:flex;justify-content:space-between;font-size:11px;gap:8px"><span>📍 ${escapeHtml(j.location)} (${dist} km)</span><span>💰 ${formatPayment(j.payment)}</span></div>
        <div class="view-count">👁 ${j.views || 0} Aufrufe</div>
    </div>`;
}

// ---------- JOB ERSTELLEN ----------
function showCreateJobScreen() {
    updateHeader('create');
    document.getElementById('main-content').innerHTML = `<div style="padding:14px">
        <h2>Job erstellen</h2>
        <div class="job-type-selector">
            <div class="type-option ${selectedJobType === 'offer' ? 'active' : ''}" onclick="selectJobType(event,'offer')">Ich biete Hilfe an</div>
            <div class="type-option ${selectedJobType === 'seek' ? 'active' : ''}" onclick="selectJobType(event,'seek')">Ich suche Hilfe</div>
        </div>
        <input id="job-title" class="form-input" placeholder="Titel">
        <select id="job-category" class="form-input" onchange="toggleCustomCategory()">
            <option value="">Kategorie</option>${categories.filter(c => c !== 'Alle').map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
        </select>
        <div id="custom-category-div" style="display:none"><input id="custom-category" class="form-input" placeholder="Eigene Kategorie"></div>
        <textarea id="job-description" class="form-textarea" placeholder="Beschreibung"></textarea>
        <input id="job-location" class="form-input" placeholder="Ort (Stadt)" value="${escapeHtml(userLocation?.address || userLocation?.name || '')}">
        <input id="job-payment" class="form-input" placeholder="Betrag (z.B. 15)">
        <button class="btn btn-accent" onclick="createJob()">Veröffentlichen</button>
    </div>`;
}
function selectJobType(evt, type) {
    selectedJobType = type;
    document.querySelectorAll('.type-option').forEach(el => el.classList.remove('active'));
    evt.currentTarget.classList.add('active');
}
function toggleCustomCategory() {
    const sel = document.getElementById('job-category');
    const customDiv = document.getElementById('custom-category-div');
    customDiv.style.display = (sel.value === 'Eigene...') ? 'block' : 'none';
}
async function createJob() {
    const ttl = document.getElementById('job-title')?.value.trim();
    let cat = document.getElementById('job-category')?.value;
    const customCat = document.getElementById('custom-category')?.value.trim();
    if (cat === 'Eigene...' && customCat) cat = customCat;
    const desc = document.getElementById('job-description')?.value.trim();
    const loc = document.getElementById('job-location')?.value.trim();
    const pay = document.getElementById('job-payment')?.value.trim();
    if (!ttl || !cat || !desc || !loc || !pay) { showToast('Alle Felder ausfüllen'); return; }
    getPreciseLocation(async () => {
        const coords = await getRandomPointInCity(loc);
        if (isStratoBackend()) {
            await stratoCreateJob({
                title: ttl, category: cat, description: desc, location: loc, payment: pay,
                lat: coords.lat, lng: coords.lng, createdBy: currentUser.uid, creatorName: currentUser.name,
                status: 'offen', views: 0, archived: false, jobType: selectedJobType
            });
        } else {
            await db.collection('jobs').add({
                title: ttl, category: cat, description: desc, location: loc, payment: pay,
                lat: coords.lat, lng: coords.lng, createdBy: currentUser.uid, creatorName: currentUser.name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(), status: 'offen', views: 0,
                ratings: {}, archived: false, jobType: selectedJobType
            });
        }
        showToast('Job erstellt');
        navigateTo('jobs');
    });
}

// ---------- JOB DETAIL / BEARBEITEN ----------
async function showJobDetailScreen(jobId) {
    updateHeader('job-detail');
    document.getElementById('main-content').innerHTML = '<div class="spinner"></div>';
    let job = null;
    let jobRef = null;

    try {
        if (isStratoBackend()) {
            job = await stratoGetJob(jobId);
        } else {
            jobRef = db.collection('jobs').doc(jobId);
            const doc = await jobRef.get();
            job = doc.data();
        }
    } catch (err) {
        document.getElementById('main-content').innerHTML = `<div class="empty-state">Fehler beim Laden: ${escapeHtml(err.message)}</div>`;
        return;
    }

    if (!job) { document.getElementById('main-content').innerHTML = '<div class="empty-state">Job nicht gefunden</div>'; return; }
    if (!viewedJobs.includes(jobId) && currentUser?.uid !== job.createdBy) {
        viewedJobs.push(jobId);
        saveViewedJobs();
        if (isStratoBackend()) await stratoIncrementJobViews(jobId).catch(() => {});
        else await jobRef.update({ views: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
        job.views = (job.views || 0) + 1;
    }
    const isOwner = currentUser && currentUser.uid === job.createdBy;
    const canManage = isOwner || isAdmin();
    const dist = userLocation && job.lat && job.lng ? calculateDistance(userLocation.lat, userLocation.lng, job.lat, job.lng) : '?';
    document.getElementById('main-content').innerHTML = `<div style="padding:14px">
        <div class="card" style="cursor:auto">
            <div style="display:flex;justify-content:space-between;gap:8px">
                <h2>${escapeHtml(job.title)}</h2>
                <span class="job-category">${escapeHtml(job.category)}</span>
            </div>
            <div class="badge-line">
                <span class="job-type-badge">${job.jobType === 'offer' ? 'Biete Hilfe' : 'Suche Hilfe'}</span>
                <span class="status-badge ${job.status === 'reserviert' ? 'status-reserviert' : 'status-offen'}">${escapeHtml(job.status || 'offen')}</span>
            </div>
            <p style="margin:12px 0;white-space:pre-wrap">${escapeHtml(job.description)}</p>
            <p class="small-muted">📍 ${escapeHtml(job.location)} · ${dist} km</p>
            <p class="small-muted">💰 ${formatPayment(job.payment)}</p>
            <p class="small-muted">Von: ${escapeHtml(job.creatorName || 'Unbekannt')}</p>
            <p class="small-muted">👁 ${job.views || 0} Aufrufe</p>
        </div>
        ${!isOwner ? `<button class="btn btn-accent" onclick="startChatForJob('${jobId}')">Kontakt aufnehmen</button>` : ''}
        ${canManage ? `<button class="btn btn-primary" onclick="navigateTo('edit-job','${jobId}')">Bearbeiten</button>
        <button class="btn btn-outline" onclick="toggleJobStatus('${jobId}', '${job.status === 'reserviert' ? 'offen' : 'reserviert'}')">${job.status === 'reserviert' ? 'Wieder öffnen' : 'Reservieren'}</button>
        <button class="btn btn-danger" onclick="deleteJob('${jobId}')">Löschen</button>` : ''}
    </div>`;
}
async function showEditJobScreen(jobId) {
    updateHeader('edit-job');
    let job = null;
    try {
        if (isStratoBackend()) job = await stratoGetJob(jobId);
        else {
            const doc = await db.collection('jobs').doc(jobId).get();
            job = doc.data();
        }
    } catch (err) {
        document.getElementById('main-content').innerHTML = `<div class="empty-state">Fehler beim Laden: ${escapeHtml(err.message)}</div>`;
        return;
    }
    if (!job) { document.getElementById('main-content').innerHTML = '<div class="empty-state">Job nicht gefunden</div>'; return; }
    if (job.createdBy !== currentUser.uid && !isAdmin()) { showToast('Keine Berechtigung'); goBack(); return; }
    document.getElementById('main-content').innerHTML = `<div style="padding:14px">
        <h2>Job bearbeiten</h2>
        <input id="edit-title" class="form-input" value="${escapeHtml(job.title)}">
        <input id="edit-category" class="form-input" value="${escapeHtml(job.category)}">
        <textarea id="edit-description" class="form-textarea">${escapeHtml(job.description)}</textarea>
        <input id="edit-location" class="form-input" value="${escapeHtml(job.location)}">
        <input id="edit-payment" class="form-input" value="${escapeHtml(job.payment)}">
        <select id="edit-status" class="form-input"><option value="offen" ${job.status === 'offen' ? 'selected' : ''}>offen</option><option value="reserviert" ${job.status === 'reserviert' ? 'selected' : ''}>reserviert</option></select>
        <button class="btn btn-accent" onclick="saveJobEdit('${jobId}')">Speichern</button>
    </div>`;
}
async function saveJobEdit(jobId) {
    const loc = document.getElementById('edit-location').value.trim();
    const coords = await getRandomPointInCity(loc);
    const payload = {
        title: document.getElementById('edit-title').value.trim(),
        category: document.getElementById('edit-category').value.trim(),
        description: document.getElementById('edit-description').value.trim(),
        location: loc,
        payment: document.getElementById('edit-payment').value.trim(),
        status: document.getElementById('edit-status').value,
        lat: coords.lat,
        lng: coords.lng
    };
    if (isStratoBackend()) await stratoUpdateJob(jobId, payload);
    else await db.collection('jobs').doc(jobId).update({ ...payload, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    showToast('Gespeichert');
    navigateTo('job-detail', jobId);
}
async function toggleJobStatus(jobId, status) {
    if (isStratoBackend()) await stratoUpdateJob(jobId, { status });
    else await db.collection('jobs').doc(jobId).update({ status });
    showToast(status === 'reserviert' ? 'Reserviert' : 'Wieder geöffnet');
    showJobDetailScreen(jobId);
}
async function deleteJob(jobId) {
    if (!confirm('Diesen Job wirklich löschen?')) return;
    if (isStratoBackend()) await stratoDeleteJob(jobId);
    else await db.collection('jobs').doc(jobId).delete();
    showToast('Gelöscht');
    navigateTo('jobs');
}
async function showMyJobs() {
    updateHeader('my-jobs');
    document.getElementById('main-content').innerHTML = '<div class="spinner"></div>';
    if (isStratoBackend()) {
        try {
            const jobs = await stratoListJobs({ createdBy: currentUser.uid });
            const html = jobs.length === 0 ? '<div class="empty-state">Du hast noch keine Jobs erstellt</div>' : jobs.map(j => renderJobCard(j.id, j)).join('');
            document.getElementById('main-content').innerHTML = `<div id="jobs-list" style="padding-top:8px">${html}</div>`;
        } catch (err) {
            document.getElementById('main-content').innerHTML = `<div class="empty-state">STRATO-Datenbankfehler: ${escapeHtml(err.message)}</div>`;
        }
        return;
    }
    const snap = await db.collection('jobs').where('createdBy', '==', currentUser.uid).orderBy('createdAt','desc').get();
    const html = snap.empty ? '<div class="empty-state">Du hast noch keine Jobs erstellt</div>' : snap.docs.map(d => renderJobCard(d.id, d.data())).join('');
    document.getElementById('main-content').innerHTML = `<div id="jobs-list" style="padding-top:8px">${html}</div>`;
}
function showRatingsScreen() {
    updateHeader('ratings');
    document.getElementById('main-content').innerHTML = '<div class="empty-state">Bewertungen sind in der hochgeladenen Datei nicht vollständig enthalten. Hier kann die Bewertungslogik ergänzt werden.</div>';
}
