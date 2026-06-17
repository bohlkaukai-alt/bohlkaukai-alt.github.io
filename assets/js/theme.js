// ---------- DESIGN / DARKMODE ----------
function getSavedTheme() {
    return localStorage.getItem('app_theme') || 'light';
}

function applyTheme(theme) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', normalized);
    if (document.body) document.body.setAttribute('data-theme', normalized);
    updateThemeToggleButtons(normalized);
}

function applySavedTheme() {
    applyTheme(getSavedTheme());
}

function toggleTheme() {
    const current = document.body?.getAttribute('data-theme') || getSavedTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('app_theme', next);
    applyTheme(next);
    showToast(next === 'dark' ? 'Darkmode aktiviert' : 'Hellmodus aktiviert');
}

function themeToggleMarkup() {
    const theme = getSavedTheme();
    const icon = theme === 'dark' ? 'light_mode' : 'dark_mode';
    const label = theme === 'dark' ? 'Hellmodus aktivieren' : 'Darkmode aktivieren';
    return `<button class="theme-toggle" type="button" onclick="toggleTheme()" aria-label="${label}" title="${label}"><span class="material-icons theme-toggle-icon">${icon}</span></button>`;
}

function updateThemeToggleButtons(theme) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        const label = normalized === 'dark' ? 'Hellmodus aktivieren' : 'Darkmode aktivieren';
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
    });
    document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
        icon.textContent = normalized === 'dark' ? 'light_mode' : 'dark_mode';
    });
    const status = document.getElementById('theme-status-text');
    if (status) status.textContent = normalized === 'dark' ? 'Darkmode' : 'Hellmodus';
}
