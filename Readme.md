# MiniJob Finder

MiniJob Finder ist eine Web-App, mit der Nutzer kleine Jobs, Hilfsangebote und Gesuche in ihrer Nähe finden, erstellen und verwalten können.

Die Website ist dafür gedacht, Menschen unkompliziert miteinander zu verbinden, wenn jemand Hilfe braucht oder selbst Hilfe anbieten möchte. Beispiele sind Nachhilfe, Gartenarbeit, Hundesitting, Babysitting, Einkaufen helfen, Computerhilfe oder Haushaltshilfe.

## Wozu ist die Website da?

Die Website soll eine einfache Plattform für kleine lokale Aufgaben sein.

Nutzer können:

- eigene MiniJobs erstellen
- Hilfe anbieten
- Hilfe suchen
- Jobs nach Kategorien filtern
- Jobs in der Nähe finden
- den eigenen Standort verwenden
- Jobs auf einer Karte ansehen
- andere Nutzer per Chat kontaktieren
- ungelesene Nachrichten sehen
- Bewertungen ansehen
- Feedback an den Admin senden
- das eigene Profil bearbeiten
- den eigenen Account löschen

## Ziel der App

Ziel ist eine moderne, einfache und für Handy, Tablet und PC nutzbare MiniJob-Plattform.

Die App soll besonders einfach bedienbar sein:

- auf dem Smartphone wie eine App
- auf dem PC mit breitem Layout
- mit Kartenansicht
- mit Chat-Funktion
- mit Profil und Einstellungen
- mit Datenschutz- und Cookie-Einstellungen

## Hauptfunktionen

### 1. Registrierung und Login

Nutzer können sich mit Name, E-Mail, Passwort und Geburtsdatum registrieren.

Bei der Registrierung muss die Datenschutzerklärung akzeptiert werden.

Zusätzlich gibt es eine E-Mail-Validierung, damit keine offensichtlich falschen oder ungültigen E-Mail-Adressen eingegeben werden.

### 2. Jobs suchen

Auf der Startseite werden verfügbare MiniJobs angezeigt.

Die Jobs können gefiltert werden nach:

- Suchbegriff
- Kategorie
- Art des Jobs
- Entfernung
- Standort

### 3. Jobs erstellen

Nutzer können eigene Anzeigen erstellen.

Dabei können angegeben werden:

- Titel
- Kategorie
- Beschreibung
- Ort oder Adresse
- Bezahlung
- ob Hilfe angeboten oder gesucht wird

### 4. Standort und Karte

Die App kann den Standort des Nutzers verwenden, wenn der Nutzer die Standortfreigabe erlaubt.

Der Standort wird genutzt für:

- Entfernung zu Jobs
- Umkreissuche
- Kartenansicht
- Standort-Nadel auf der Karte

Auf der Karte wird der eigene Standort sichtbar angezeigt.

### 5. Chat

Nutzer können andere Nutzer zu einem Job kontaktieren.

Die Chat-Funktion enthält:

- private Chats
- ungelesene Nachrichten
- Hinweis „Ungelesene Nachrichten“
- automatisches Scrollen zur ersten ungelesenen Nachricht
- Drei-Punkte-Menü wie bei WhatsApp
- Aktionen wie Anpinnen, als ungelesen markieren, melden und löschen

### 6. Profil

Im Profil können Nutzer eigene Informationen sehen und verwalten.

Dazu gehören:

- Name
- E-Mail
- Wohnort
- eigene Jobs
- Bewertungen
- Einstellungen
- Account löschen

### 7. Feedback an Admin

Nutzer können Feedback senden, zum Beispiel:

- Fehler melden
- Verbesserungsvorschläge senden
- sonstige Hinweise geben

Das Feedback wird in Firebase gespeichert, damit der Admin es prüfen kann.

### 8. Datenschutz und Cookies

Die Website enthält:

- Datenschutzerklärung
- Cookie-/Speicher-Banner
- Cookie-/Speicher-Einstellungen
- Möglichkeit, optionale lokale Daten zu löschen
- Möglichkeit, den Account zu löschen

Die App verwendet keine Werbe-Cookies. Es werden aber lokale Speicherfunktionen und Firebase genutzt, damit Login, Einstellungen, Standort, Chat und Jobs funktionieren.

## Technik

Die Website ist als statische Web-App aufgebaut und kann über GitHub Pages veröffentlicht werden.

Verwendete Technik:

- HTML
- CSS
- JavaScript
- Firebase Authentication
- Cloud Firestore
- Leaflet
- OpenStreetMap
- Nominatim
- Progressive Web App Funktionen
- Service Worker

## Firebase

Firebase wird verwendet für:

- Registrierung
- Login
- Passwortverarbeitung
- Nutzerprofile
- Jobs
- Chats
- Bewertungen
- Meldungen
- Feedback

Wichtig: Passwörter werden nicht als Klartext in Firestore gespeichert. Die Passwortverarbeitung läuft über Firebase Authentication.

## GitHub Pages Veröffentlichung

Damit die Website funktioniert, müssen die Dateien im Hauptverzeichnis des GitHub-Repositorys liegen.

Wichtige Dateien und Ordner:

```text
index.html
404.html
datenschutz.html
impressum.html
manifest.json
sw.js
assets/
.github/
README.md
```

In GitHub Pages sollte eingestellt werden:

```text
Deploy from branch
Branch: main
Folder: /root
```

Die Website ist danach normalerweise erreichbar unter:

```text
https://BENUTZERNAME.github.io/REPOSITORY-NAME/
```

## Wichtige Einstellungen in Firebase

Damit Login und Datenbank funktionieren, müssen in Firebase passende Einstellungen vorgenommen werden.

### Authentication

Aktivieren:

- E-Mail/Passwort Anmeldung

Bei autorisierten Domains muss die GitHub-Pages-Domain eingetragen sein, zum Beispiel:

```text
BENUTZERNAME.github.io
```

### Firestore

Cloud Firestore muss aktiviert sein.

Außerdem müssen Firestore-Regeln so gesetzt werden, dass angemeldete Nutzer die App verwenden können, aber keine fremden Daten unkontrolliert verändern dürfen.

## Datenschutz-Hinweis

Die App verarbeitet personenbezogene Daten, z. B.:

- Name
- E-Mail-Adresse
- Standortdaten
- Job-Anzeigen
- Chat-Nachrichten
- Bewertungen
- Feedback
- technische Nutzungsdaten

Deshalb enthält die Website eine Datenschutzerklärung.

Vor einer echten öffentlichen Nutzung sollten folgende Punkte geprüft werden:

- Betreiberangaben im Impressum ergänzen
- Betreiberangaben in der Datenschutzerklärung ergänzen
- Firebase-Auftragsverarbeitung prüfen
- Firestore-Regeln absichern
- vollständige Löschroutine für Nutzer, Jobs, Chats und Bewertungen prüfen
- Nutzung durch Minderjährige rechtlich prüfen

## Dateien im Projekt

### Hauptdateien

- `index.html`  
  Startseite der App

- `404.html`  
  Fehlerseite für GitHub Pages

- `datenschutz.html`  
  Datenschutzerklärung

- `impressum.html`  
  Impressum mit Social-Media-Links

- `manifest.json`  
  PWA-Konfiguration

- `sw.js`  
  Service Worker für Cache und PWA-Funktionen

### JavaScript

- `assets/js/core.js`  
  Grundfunktionen, Firebase, globale Variablen, Standort, Hilfsfunktionen

- `assets/js/auth.js`  
  Login, Registrierung und E-Mail-Validierung

- `assets/js/jobs.js`  
  Jobs anzeigen, erstellen, bearbeiten und löschen

- `assets/js/map.js`  
  Kartenansicht und Standort-Nadel

- `assets/js/chat.js`  
  Grundfunktionen für Chats

- `assets/js/profile.js`  
  Profil, Einstellungen, Feedback und Account löschen

- `assets/js/features.js`  
  Erweiterte Funktionen und Tutorial

- `assets/js/quality.js`  
  Verbesserungen für Chat, Feedback, Performance, Badges und Layout

- `assets/js/cookies.js`  
  Cookie- und Speicher-Einstellungen

- `assets/js/social.js`  
  Instagram- und TikTok-Links

- `assets/js/device.js`  
  Geräteerkennung für Handy, Tablet und PC

- `assets/js/theme.js`  
  Hell-/Dunkelmodus

- `assets/js/navigation.js`  
  Navigation zwischen den Seiten

- `assets/js/app-init.js`  
  Start der App

### CSS

- `assets/css/style.css`  
  Design, Layout, mobile Ansicht, PC-Ansicht, Chat, Tutorial und rechtliche Seiten

## Social-Media-Links anpassen

Die Links für Instagram und TikTok können in dieser Datei angepasst werden:

```text
assets/js/social.js
```

Dort stehen diese Werte:

```js
window.MINIJOB_SOCIAL_LINKS = {
    instagram: "https://www.instagram.com/",
    tiktok: "https://www.tiktok.com/"
};
```

Hier müssen die echten Profil-Links eingetragen werden.

## Aktueller Stand

Die App enthält bereits:

- modernes responsives Layout
- PC-Layout mit dynamischer Breite
- mobile Optimierungen
- Standortfunktion mit Karte und Nadel
- Chat mit ungelesenen Nachrichten
- Drei-Punkte-Menü im Chat
- PWA-Unterstützung
- Cookie-/Speicher-Einstellungen
- Datenschutzerklärung
- Impressum
- Account löschen
- Feedback an Admin
- E-Mail-Validierung
- Tutorial mit Highlight-Funktion

## Noch zu prüfen

Vor der echten Nutzung sollten diese Punkte getestet werden:

- Registrierung mit echter E-Mail
- E-Mail-Bestätigung über Firebase
- Login auf Handy und PC
- Standortfreigabe auf Handy und PC
- Job erstellen
- Job suchen
- Chat starten
- ungelesene Nachrichten
- Feedback senden
- Account löschen
- Firestore Security Rules
- Darstellung als installierte PWA
- Impressum und Datenschutz mit echten Betreiberdaten

## Hinweis

Dieses Projekt ist eine Web-App-Vorlage. Für eine produktive Veröffentlichung müssen Datenschutz, Impressum, Firebase-Regeln und Löschkonzept sorgfältig geprüft und angepasst werden.
