// ---------- KARTE ----------
function showMapScreen() {
    updateHeader('map');
    document.getElementById('main-content').innerHTML = `
        <div class="map-filter-toggle" onclick="toggleMapFilters()"><span class="material-icons">tune</span></div>
        <div id="map-filter-bar" class="map-filter-bar closed">
            <div class="map-filters">
                ${categories.filter(c => c !== 'Eigene...').map(c => `<button class="category-filter-btn ${(!selectedCategory && c === 'Alle') || selectedCategory === c ? 'active' : ''}" onclick="setMapCategory('${c === 'Alle' ? '' : escapeJs(c)}')">${escapeHtml(c)}</button>`).join('')}
                <select class="form-input" style="margin:0;max-width:110px" onchange="setMapRadius(this.value)">${radiusOptions.map(r => `<option value="${r}" ${r === radiusFilter ? 'selected' : ''}>${r} km</option>`).join('')}</select>
            </div>
        </div>
        <div id="job-map" class="map-container"></div>`;
    setTimeout(initMap, 50);
}
function toggleMapFilters() {
    const bar = document.getElementById('map-filter-bar');
    bar.classList.toggle('open');
    bar.classList.toggle('closed');
}
function setMapCategory(cat) { selectedCategory = cat || null; showMapScreen(); }
function setMapRadius(r) { radiusFilter = parseInt(r, 10); localStorage.setItem('mf_radius', String(radiusFilter)); showMapScreen(); }
async function initMap() {
    if (!window.L) { document.getElementById('job-map').innerHTML = '<div class="empty-state">Leaflet konnte nicht geladen werden.</div>'; return; }
    if (!userLocation) userLocation = { lat: 51.89, lng: 10.17, name: 'Seesen' };
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    mapInstance = L.map('job-map').setView([userLocation.lat, userLocation.lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(mapInstance);
    mapMarkersLayer = L.layerGroup().addTo(mapInstance);
    L.marker([userLocation.lat, userLocation.lng]).addTo(mapMarkersLayer).bindPopup('Mein Standort');
    let jobs = [];
    if (isStratoBackend()) {
        try {
            jobs = await stratoListJobs(selectedCategory ? { category: selectedCategory } : {});
        } catch (err) {
            L.popup().setLatLng([userLocation.lat, userLocation.lng]).setContent('STRATO-Datenbankfehler: ' + escapeHtml(err.message)).openOn(mapInstance);
            return;
        }
    } else {
        let query = db.collection('jobs').where('status','in',['offen','reserviert']);
        if (selectedCategory) query = query.where('category','==',selectedCategory);
        const snap = await query.get();
        jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    jobs.forEach(j => {
        if (!j.lat || !j.lng) return;
        if (calculateDistance(userLocation.lat, userLocation.lng, j.lat, j.lng) > radiusFilter) return;
        const popup = `<strong>${escapeHtml(j.title)}</strong><br>${escapeHtml(j.category)}<br>${escapeHtml(j.location)}<br>${formatPayment(j.payment)}<br><button onclick="navigateTo('job-detail','${j.id}')">Details</button>`;
        L.marker([j.lat, j.lng]).addTo(mapMarkersLayer).bindPopup(popup);
    });
}
