# MiniJob Finder - GitHub Pages Version

Diese Version ist für GitHub Pages vorbereitet. Sie enthält keine PHP-Dateien und keine STRATO-MySQL-Zugangsdaten.

## Was läuft über GitHub?

- Hosting der Website über GitHub Pages
- HTML, CSS und JavaScript direkt aus dem Repository
- Automatische Veröffentlichung über GitHub Actions, wenn du auf `main` pushst

## Was läuft nicht direkt über GitHub?

GitHub Pages unterstützt keine PHP-Dateien und keine direkte MySQL-Verbindung. Deshalb laufen Login, Jobs, Chat und Feedback in dieser Version über Firebase Authentication und Firestore.

## Dateien

- `index.html` - Hauptdatei der App
- `assets/css/style.css` - modernes Design, Darkmode, Handy/Tablet/PC-Layout
- `assets/js/device.js` - erkennt Handy, Tablet/iPad oder PC
- `assets/js/theme.js` - Darkmode-Toggle mit Speicherung
- `assets/js/core.js` - Firebase-Grundlogik und globale App-Funktionen
- `.github/workflows/deploy-pages.yml` - GitHub-Actions-Deployment
- `.nojekyll` - verhindert Jekyll-Verarbeitung

## GitHub Pages aktivieren

1. Repository auf GitHub erstellen, z. B. `minijob-finder`.
2. Alle Dateien aus diesem Ordner ins Repository hochladen.
3. In GitHub öffnen: `Settings` → `Pages`.
4. Als Source `GitHub Actions` auswählen.
5. Änderungen auf den Branch `main` pushen.
6. Danach ist die Seite ungefähr unter dieser Adresse erreichbar:

   `https://DEIN-GITHUB-NAME.github.io/minijob-finder/`

## Wichtig für Firebase Login

Damit der Login auf GitHub Pages funktioniert, musst du deine GitHub-Pages-Domain in Firebase freigeben:

1. Firebase Console öffnen.
2. Dein Projekt `minijob-41400` öffnen.
3. `Authentication` öffnen.
4. Bereich `Settings` / `Authorisierte Domains` öffnen.
5. Diese Domain hinzufügen:

   `DEIN-GITHUB-NAME.github.io`

Wenn du eine eigene Domain nutzt, musst du auch diese Domain hinzufügen.

## Wichtig zu STRATO

Die STRATO-Datenbankdaten wurden entfernt. Sie gehören nicht in ein GitHub-Repository. Falls du später unbedingt STRATO-MySQL nutzen willst, brauchst du ein separates PHP-Backend auf STRATO und die GitHub-Seite würde nur per API darauf zugreifen. Dann müssen CORS und API-Sicherheit sauber eingerichtet werden.

## Test

Lokal kannst du die App einfach mit einem kleinen lokalen Webserver testen:

```bash
python -m http.server 8080
```

Danach im Browser öffnen:

```text
http://localhost:8080
```
