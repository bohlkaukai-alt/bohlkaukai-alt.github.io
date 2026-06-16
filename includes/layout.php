<body data-theme="light">
<script>
    (function () {
        try {
            var theme = localStorage.getItem('app_theme') || 'light';
            document.body.setAttribute('data-theme', theme);
        } catch (e) {}
    })();
</script>
<div id="app">
    <div id="app-header-container"></div>
    <div class="main-content" id="main-content"></div>
    <nav class="bottom-nav hidden" id="bottom-nav">
        <button class="nav-item active" data-page="jobs" onclick="setActiveNav(this); navigateTo('jobs')"><span class="material-icons">home</span><span>Start</span></button>
        <button class="nav-item" data-page="map" onclick="setActiveNav(this); navigateTo('map')"><span class="material-icons">map</span><span>Karte</span></button>
        <button class="nav-item" data-page="create" onclick="setActiveNav(this); navigateTo('create')"><span class="material-icons">add_circle_outline</span><span>Neu</span></button>
        <button class="nav-item" data-page="chats" onclick="setActiveNav(this); navigateTo('chats')"><span class="material-icons">chat_bubble_outline</span><span>Chat</span></button>
        <button class="nav-item" data-page="profile" onclick="setActiveNav(this); navigateTo('profile')"><span class="material-icons">person_outline</span><span>Profil</span></button>
    </nav>
</div>
<input type="file" id="chat-image-upload" accept="image/*" style="display:none">
