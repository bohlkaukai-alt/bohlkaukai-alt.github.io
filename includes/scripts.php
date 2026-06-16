<?php require_once __DIR__ . '/config.php'; ?>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
    window.MINIJOB_FIREBASE_CONFIG = <?= json_encode($firebaseConfig, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>;
</script>
<script src="assets/js/core.js"></script>
<script src="assets/js/theme.js"></script>
<script src="assets/js/navigation.js"></script>
<script src="assets/js/auth.js"></script>
<script src="assets/js/jobs.js"></script>
<script src="assets/js/map.js"></script>
<script src="assets/js/chat.js"></script>
<script src="assets/js/profile.js"></script>
<script src="assets/js/app-init.js"></script>
</body>
