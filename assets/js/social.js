// ---------- Social Media Links ----------
// Hier deine echten Profile eintragen.
window.MINIJOB_SOCIAL_LINKS = {
    instagram: "https://www.instagram.com/",
    tiktok: "https://www.tiktok.com/"
};

function applySocialLinks() {
    const links = window.MINIJOB_SOCIAL_LINKS || {};
    document.querySelectorAll('[data-social="instagram"], #impressum-instagram').forEach(a => {
        a.href = links.instagram || "https://www.instagram.com/";
        a.target = "_blank";
        a.rel = "noopener";
    });
    document.querySelectorAll('[data-social="tiktok"], #impressum-tiktok').forEach(a => {
        a.href = links.tiktok || "https://www.tiktok.com/";
        a.target = "_blank";
        a.rel = "noopener";
    });
}

function socialFooterMarkup() {
    return `<div class="social-footer">
        <a href="impressum.html">Impressum</a>
        <a href="datenschutz.html">Datenschutz</a>
        <a data-social="instagram" href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram</a>
        <a data-social="tiktok" href="https://www.tiktok.com/" target="_blank" rel="noopener">TikTok</a>
    </div>`;
}

function ensureSocialFooter() {
    const app = document.getElementById('app');
    if (!app || document.getElementById('social-footer')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'social-footer';
    wrapper.innerHTML = socialFooterMarkup();
    app.appendChild(wrapper);
    applySocialLinks();
}

document.addEventListener('DOMContentLoaded', () => {
    ensureSocialFooter();
    applySocialLinks();
});
