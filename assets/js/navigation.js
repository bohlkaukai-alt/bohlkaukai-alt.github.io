// ---------- NAVIGATION ----------
function setActiveNav(btn) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}
function syncActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
}
function updateHeader(page) {
    const c = document.getElementById('app-header-container');
    const main = ['jobs','map','create','chats','profile','settings'];
    const back = !main.includes(page) && page !== 'login';
    if (page === 'login') { c.innerHTML = ''; return; }
    const toggle = typeof themeToggleMarkup === 'function' ? themeToggleMarkup() : '<div style="width:40px"></div>';
    const deviceBadge = typeof deviceBadgeMarkup === 'function' ? deviceBadgeMarkup() : '';
    if (back) {
        c.innerHTML = `<div class="app-header"><button class="back-arrow" onclick="goBack()" aria-label="Zurück">←</button><span class="header-title">Zurück</span>${deviceBadge}${toggle}</div>`;
    } else {
        c.innerHTML = `<div class="app-header"><h1><span>💼 MiniJob</span> Finder</h1>${deviceBadge}${toggle}</div>`;
    }
    if (typeof updateThemeToggleButtons === 'function') updateThemeToggleButtons(document.body?.getAttribute('data-theme') || getSavedTheme());
}
function navigateTo(page, data = null, addToHistory = true) {
    if (addToHistory && currentPage && currentPage !== page) {
        navigationHistory.push({ page: currentPage, data: currentPageData });
    }
    currentPage = page;
    currentPageData = data;
    updateHeader(page);
    syncActiveNav(page);
    cleanupListeners();

    if (!currentUser && page !== 'login') { showLoginScreen(); return; }
    if (page === 'login') showLoginScreen();
    else if (page === 'jobs') showJobsScreen();
    else if (page === 'map') showMapScreen();
    else if (page === 'create') showCreateJobScreen();
    else if (page === 'chats') showChatsScreen();
    else if (page === 'profile') showProfileScreen();
    else if (page === 'settings') showSettingsScreen();
    else if (page === 'job-detail') showJobDetailScreen(data);
    else if (page === 'ratings') showRatingsScreen();
    else if (page === 'my-jobs') showMyJobs();
    else if (page === 'edit-profile') editProfileScreen();
    else if (page === 'feedback') showFeedbackScreen();
    else if (page === 'edit-job') showEditJobScreen(data);
    else if (page === 'chat') showChatScreen(data);
    else showJobsScreen();
}
function goBack() {
    if (navigationHistory.length) {
        const p = navigationHistory.pop();
        navigateTo(p.page, p.data, false);
    } else {
        navigateTo('jobs');
    }
}
