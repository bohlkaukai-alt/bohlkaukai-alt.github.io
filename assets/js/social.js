// ---------- Social Media Links ----------
// Hier deine echten Profile eintragen.
window.MINIJOB_SOCIAL_LINKS = {
    instagram: "https://www.instagram.com/minijobfinder?igsh=dnNzYnZ6MndpODN4",
    tiktok: "https://pro.tiktok.com/t/ZG9js9GAC9k4A-fhmKc/",
    facebook: "https://www.facebook.com/share/17g7jF28Tt/"
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
    document.querySelectorAll('[data-social="facebook"], #impressum-facebook').forEach(a => {
        a.href = links.facebook || "https://www.facebook.com/";
        a.target = "_blank";
        a.rel = "noopener";
    });
}

function socialFooterMarkup() {
    return `<div class="social-footer">
        <a href="impressum.html">Impressum</a>
        <a href="datenschutz.html">Datenschutz</a>
        <a data-social="instagram" href="${window.MINIJOB_SOCIAL_LINKS.instagram}" target="_blank" rel="noopener">Instagram</a>
        <a data-social="tiktok" href="${window.MINIJOB_SOCIAL_LINKS.tiktok}" target="_blank" rel="noopener">TikTok</a>
        <a data-social="facebook" href="${window.MINIJOB_SOCIAL_LINKS.facebook}" target="_blank" rel="noopener">Facebook</a>
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
