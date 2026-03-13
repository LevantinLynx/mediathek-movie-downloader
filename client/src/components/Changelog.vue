<template>
  <section class="info">
    <h2>Aktuelle Version</h2>
    <h4>{{ settingsStore.version }}</h4>
  </section>
  <section class="info">
    <h2>Changelog</h2>

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
</style>