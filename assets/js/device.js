// ---------- GERÄTEERKENNUNG / RESPONSIVE LAYOUT ----------
(function () {
    const DEVICE_LABELS = {
        mobile: 'Handy',
        tablet: 'Tablet / iPad',
        desktop: 'PC'
    };

    function detectDevice() {
        const ua = navigator.userAgent || '';
        const platform = navigator.platform || '';
        const width = Math.min(window.innerWidth || screen.width || 0, screen.width || window.innerWidth || 0);
        const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
        const isIPad = /iPad/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isTabletUA = /Tablet|Android(?!.*Mobile)|Silk|Kindle|PlayBook/.test(ua);
        const isMobileUA = /Mobi|Android|iPhone|iPod|Windows Phone/.test(ua) && !isIPad && !isTabletUA;

        let type = 'desktop';
        if (isMobileUA || width <= 640) type = 'mobile';
        else if (isIPad || isTabletUA || (hasTouch && width <= 1180) || width <= 1024) type = 'tablet';

        let os = 'desktop';
        if (/iPad|iPhone|iPod/.test(ua) || isIPad) os = 'ios';
        else if (/Android/.test(ua)) os = 'android';
        else if (/Windows/.test(ua)) os = 'windows';
        else if (/Mac OS|Macintosh/.test(ua)) os = 'macos';
        else if (/Linux/.test(ua)) os = 'linux';

        return {
            type,
            os,
            label: DEVICE_LABELS[type] || 'PC',
            width: window.innerWidth || 0,
            height: window.innerHeight || 0,
            orientation: (window.innerWidth || 0) > (window.innerHeight || 0) ? 'landscape' : 'portrait',
            touch: hasTouch
        };
    }

    function applyDevice() {
        const info = detectDevice();
        window.MINIJOB_DEVICE = info;
        document.documentElement.setAttribute('data-device', info.type);
        document.documentElement.setAttribute('data-os', info.os);
        document.documentElement.setAttribute('data-orientation', info.orientation);
        if (document.body) {
            document.body.setAttribute('data-device', info.type);
            document.body.setAttribute('data-os', info.os);
            document.body.setAttribute('data-orientation', info.orientation);
        }
        const app = document.getElementById('app');
        if (app) {
            app.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
            app.classList.add('device-' + info.type);
        }
        document.querySelectorAll('[data-device-label]').forEach(el => { el.textContent = info.label; });
    }

    let resizeTimer = null;
    window.applyMiniJobDeviceLayout = applyDevice;
    window.getMiniJobDevice = () => window.MINIJOB_DEVICE || detectDevice();
    window.deviceBadgeMarkup = () => `<span class="device-pill" title="Automatisch erkanntes Gerät"><span class="material-icons">${(window.MINIJOB_DEVICE?.type || detectDevice().type) === 'mobile' ? 'smartphone' : ((window.MINIJOB_DEVICE?.type || detectDevice().type) === 'tablet' ? 'tablet_mac' : 'desktop_windows')}</span><span data-device-label>${escapeHtml((window.MINIJOB_DEVICE || detectDevice()).label)}</span></span>`;

    applyDevice();
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(applyDevice, 120);
    });
    window.addEventListener('orientationchange', () => setTimeout(applyDevice, 200));
})();
