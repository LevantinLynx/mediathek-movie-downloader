<template>
  <section class="info">
    <h2>Aktuelle Version</h2>
    <h4>{{ settingsStore.version }}</h4>
  </section>
  <section class="info">
    <h2>Changelog</h2>

    <div class="scrollWrapper">
      <h4>2026.8.8</h4>
      <ul>
        <li>Regex update für ZDF api key extraktion.</li>
      </ul>

      <h4>2026.7.22</h4>
      <ul>
        <li>3sat taucht nun wieder im Filter der Übersicht auf.</li>
      </ul>

      <h4>2026.6.27</h4>
      <ul>
        <li>Änderungen an der 3sat API übernommen.</li>
        <li>Verfügbarkeit Text bei Filmen von 3sat behoben.</li>
        <li>Info zu Jahr, Schauspieler &amp; Crew bei ZDF, arte und 3sat hinzugefügt.</li>
      </ul>

      <h4>2026.6.5</h4>
      <ul>
        <li>Änderung der Arte API übernommen</li>
      </ul>

      <h4>2026.4.12</h4>
      <ul>
        <li>Fehler bei kleinen Bildern in der Filmliste behoben</li>
      </ul>

      <h4>2026.3.20</h4>
      <ul>
        <li>movie.nfo Generierung jetzt optional</li>
        <li>TV-Sender Reihenfolge geändert</li>
        <li>Version wird nun im Log ausgegeben</li>
      </ul>

      <h4>2026.3.13</h4>
      <ul>
        <li>Frontend Reorganisierung</li>
        <li>Optimierung der Benachrichtigungen</li>
      </ul>

      <h4>2026.3.11</h4>
      <ul>
        <li>PWA Erkennung und Styling</li>
        <li>Fehlerbehebung bei der movie.nfo Erstellung</li>
        <li>Ignore &amp; Erledigt Liste auf 8 begrenzt</li>
        <li>Style Anpassungen</li>
        <li>Typo Fixes</li>
      </ul>

      <h4>2026.3.8</h4>
      <p>
        Kompletter Rewrite des Frontends mit Vue3 und großer Teile des Backends um die
        Performance zu verbessern und neue Funktionalitäten zu ermöglichen. Größtenteils
        für geplante Features wie mehrere Videospuren, pro Film Optionen etc.
      </p>
      <ul>
        <li>Frontend mit Vue3</li>
        <li>Meta Daten von TMDB, IMDb, OMDb (Rating, Erscheinungsjahr, Schauspieler u. v. m.)</li>
        <li>Bilder Cache &amp; Komprimierung</li>
        <li>Automative Konvertierung der Untertitel nach .srt</li>
        <li>Automatische Generierung von Ordner- und Dateinamen für Jellyfin, Plex etc. basierend auf Metadaten von TMDB, IMDb, OMDb</li>
        <li>Automatische Generierung der movie.nfo Datei je Film</li>
        <li>Besserer Support für ARD Sender Gruppe bei mehrsprachingen Downloads</li>
        <li>Optimierung für Mobile/PWA</li>
      </ul>

      <h4>2026.2.8</h4>
      <ul>
        <li>
          Ab dieser Version verwendet das Projekt "Calendar Versioning (CalVer)" um den Softwarestand besser zu kommunizieren.<br>
          <a href="https://calver.org/" target="_blank">https://calver.org/</a>
        </li>
        <li>Channel werden immer in derselben Reihenfolge angezeigt.</li>
        <li>Changelog hinzugefügt</li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { useSettingsStore } from '@/stores/settings'
const settingsStore = useSettingsStore()
</script>

<style scoped>
.info h2 {
  margin: calc(var(--boxMargin) * 4) 0 var(--boxMargin);
  font-size: 2.8rem;
  font-weight: 300;
}
.info p {
  margin-block: 1em;
}
.info h4 {
  margin: calc(var(--boxMargin) * 2) 0 var(--boxMargin);
  font-size: 2rem;
  font-weight: 600;
}
a {
  display: inline-block;
  color: var(--main);
  text-decoration: none;
}
.info a:not(:last-child) {
  margin-bottom: .2rem;
}
.info ul {
  list-style: square;
  margin-left: 1.7rem;
}
.info ul li:not(:first-child) {
  margin-top: .6rem;
}
.scrollWrapper {
  border-radius: var(--borderRadius);
  overflow-y: scroll;
  max-height: 45rem;
  padding: 2rem;
  background-color: rgba(0,0,0,.1);
  background-color: var(--bg3);
  box-shadow: var(--boxShadow);

  scrollbar-color: var(--main) var(--bg2);
  scrollbar-width: thin;
}
.scrollWrapper h4:first-of-type {
  margin-top: 0;
}
</style>