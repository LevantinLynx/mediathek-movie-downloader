<template>
  <section id="extraInfo" class="extraInfo">
    <h1>Nützliche Infos &amp; Skripte</h1>
    <article class="script box">
      <header>
        <h2>Sprach- &amp; Ländercodes</h2>
      </header>
      <p>
        ISO-639-2 Dreistellige Länder Codes. <a target="_blank" href="https://de.wikipedia.org/wiki/Liste_der_ISO-639-2-Codes">ISO-639-2 Codes (Wikipedia)</a>
      </p>
      <p>
        <a target="_blank" href="https://www.loc.gov/standards/iso639-2/php/code_list.php">https://www.loc.gov/standards/iso639-2/php/code_list.php</a>
      </p>
    </article>

    <article class="script box">
      <header>
        <h2>Umbenennen & Reordern von Tonspuren</h2>
      </header>
      <p>
        Die Originaldatei hat drei Tonspuren: Deutsch, Englisch und Deutsch mit Audiodeskription.<br>
        Neue Reihenfolge soll Englisch, Deutsch, Deutsch mit Audiodeskription sein und die Tonspuren ordentlich benannt werden.
      </p>
      <p>
        <button class="codeSwitch" @click="showCodeComments.audioRename = !showCodeComments.audioRename">
          <span v-if="showCodeComments.audioRename">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 15H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M8 15L10.5 12.5V12.5C10.7761 12.2239 10.7761 11.7761 10.5 11.5V11.5L8 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M3 8C3 6.11438 3 5.17157 3.58579 4.58579C4.17157 4 5.11438 4 7 4H12H17C18.8856 4 19.8284 4 20.4142 4.58579C21 5.17157 21 6.11438 21 8V12V16C21 17.8856 21 18.8284 20.4142 19.4142C19.8284 20 18.8856 20 17 20H12H7C5.11438 20 4.17157 20 3.58579 19.4142C3 18.8284 3 17.8856 3 16V12V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span>
              Befehl
            </span>
          </span>
          <span v-if="!showCodeComments.audioRename">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 9L17 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M7 12L13 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M21 13V7C21 5.11438 21 4.17157 20.4142 3.58579C19.8284 3 18.8856 3 17 3H7C5.11438 3 4.17157 3 3.58579 3.58579C3 4.17157 3 5.11438 3 7V13C3 14.8856 3 15.8284 3.58579 16.4142C4.17157 17 5.11438 17 7 17H9H9.02322C9.31982 17 9.5955 17.1528 9.75269 17.4043L11.864 20.7824C11.9268 20.8829 12.0732 20.8829 12.136 20.7824L14.2945 17.3288C14.4223 17.1242 14.6465 17 14.8877 17H15H17C18.8856 17 19.8284 17 20.4142 16.4142C21 15.8284 21 14.8856 21 13Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span>
              Erklärung
            </span>
          </span>
        </button>
      </p>
      <pre v-show="showCodeComments.audioRename">
<span class="c0"># Alle Nummerierungen beginnen bei 0 als erstem Wert.</span>

ffmpeg \
-i '<span class="c1">Film.mkv</span>' \ <span class="c0"># <span class="c1">Input Datei 0.</span> Es können weitere Dateien mit -i Datei_0.ext -i Datei_1.ext etc. angegeben werden.</span>
-c:a copy -c:v copy \ <span class="c0"># Audio- &amp; Videospuren sollen Kopiert und nicht transcoded werden. Angabe wird nur ein mal benötigt, unabhängig der Anzahl der Inputs.</span>
-map <span class="c1">0</span>:v:<span class="c2">0</span> \ <span class="c0"># Kopiert <span class="c2">Videospur 0</span> aus <span class="c1">Input Datei 0</span></span>
-map <span class="c1">0</span>:a:<span class="c3">1</span> \ <span class="c0"># Kopiert <span class="c3">Tonspur 1</span> der <span class="c1">Input Datei 0</span> an Position 0 der <span class="c5">neuen Datei.</span> Die Reihenfolge wird durch die Position des -map im Befehl bestimmt.</span>
-map <span class="c1">0</span>:a:<span class="c3">0</span> \ <span class="c0"># Kopiert <span class="c3">Tonspur 0</span> der <span class="c1">Input Datei 0</span> an Position 1 der <span class="c5">neuen Datei.</span></span>
-map <span class="c1">0</span>:a:<span class="c3">2</span> \ <span class="c0"># Kopiert <span class="c3">Tonspur 2</span> der <span class="c1">Input Datei 0</span> an Position 2 der <span class="c5">neuen Datei.</span></span>
-metadata:s:a:<span class="c5">0</span> language=eng \ <span class="c0"># Setzt die Sprache der <span class="c5">Tonspur 0</span> auf Englisch (Sprach-Codes siehe "ISO 639-2")</span>
-metadata:s:a:<span class="c5">0</span> title="Englisch (Originalton)" \ <span class="c0"># Setzt den Text der <span class="c5">Tonspur 0</span> in Programmen angezeigt wird auf "Englisch (Originalton)". Der Text ist frei wählbar.</span>
-metadata:s:a:<span class="c5">1</span> language=deu \ <span class="c0"># Setzt die Sprache der <span class="c5">Tonspur 1</span> auf Deutsch</span>
-metadata:s:a:<span class="c5">1</span> title="Deutsch" \ <span class="c0"># Setzt den Text der <span class="c5">Tonspur 1</span> in Programmen angezeigt wird auf "Deutsch"</span>
-metadata:s:a:<span class="c5">2</span> language=deu \ <span class="c0"># Setzt die Sprache der <span class="c5">Tonspur 2</span> auf Deutsch</span>
-metadata:s:a:<span class="c5">2</span> title="Deutsch (Audiotranskription)" \ <span class="c0"># Setzt den Text der 2 Tonspur in Programmen angezeigt wird auf "Deutsch (Audiotranskription)"</span>
<span class="c5">"Film.tagged.mkv"</span> <span class="c0"># Ausgabedatei</span>
</pre>
      <pre class="cleanScript" v-show="!showCodeComments.audioRename">ffmpeg \
-i 'Film.mkv' \
-c:a copy -c:v copy \
-map 0:v:0 \
-map 0:a:1 -metadata:s:a:0 language=eng -metadata:s:a:0 title="Englisch (Originalton)" \
-map 0:a:0 -metadata:s:a:1 language=deu -metadata:s:a:1 title="Deutsch" \
-map 0:a:2 -metadata:s:a:2 language=deu -metadata:s:a:2 title="Deutsch (Audiotranskription)" \
"Film.tagged.mkv"</pre>
    </article>

    <article class="script box">
      <header>
        <h2>Befehl zu bestimmtem Zeitpunkt</h2>
      </header>
      <p>
        Im Beispiel wird der Befehl am 17. November 2025 um 14 Uhr morgens ausgeführt. 
      </p>
      <p>
        <button class="codeSwitch" @click="showCodeComments.sleepCommand = !showCodeComments.sleepCommand">
          <span v-if="showCodeComments.sleepCommand">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 15H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M8 15L10.5 12.5V12.5C10.7761 12.2239 10.7761 11.7761 10.5 11.5V11.5L8 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M3 8C3 6.11438 3 5.17157 3.58579 4.58579C4.17157 4 5.11438 4 7 4H12H17C18.8856 4 19.8284 4 20.4142 4.58579C21 5.17157 21 6.11438 21 8V12V16C21 17.8856 21 18.8284 20.4142 19.4142C19.8284 20 18.8856 20 17 20H12H7C5.11438 20 4.17157 20 3.58579 19.4142C3 18.8284 3 17.8856 3 16V12V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span>
              Befehl
            </span>
          </span>
          <span v-if="!showCodeComments.sleepCommand">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 9L17 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M7 12L13 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M21 13V7C21 5.11438 21 4.17157 20.4142 3.58579C19.8284 3 18.8856 3 17 3H7C5.11438 3 4.17157 3 3.58579 3.58579C3 4.17157 3 5.11438 3 7V13C3 14.8856 3 15.8284 3.58579 16.4142C4.17157 17 5.11438 17 7 17H9H9.02322C9.31982 17 9.5955 17.1528 9.75269 17.4043L11.864 20.7824C11.9268 20.8829 12.0732 20.8829 12.136 20.7824L14.2945 17.3288C14.4223 17.1242 14.6465 17 14.8877 17H15H17C18.8856 17 19.8284 17 20.4142 16.4142C21 15.8284 21 14.8856 21 13Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span>
              Erklärung
            </span>
          </span>
        </button>
      </p>
      <pre v-show="showCodeComments.sleepCommand">
<span class="c0"># Funktioniert nur mit Daten in der Zukunft</span>
<span class="c2"># Zeitangabe in lokaler Systemzeit.</span>
<span class="c1"># Befehl der zum angegeben Zeitpunkt ausgeführt werden soll.</span>

sleep $(( $(date -f - +%s- <<< "<span class="c2">2025-11-17T14:00</span>"$'\nnow') 0 )) && <span class="c1">yt-dlp https://example.com/test-video</span>
</pre>
      <pre class="cleanScript" v-show="!showCodeComments.sleepCommand">sleep $(( $(date -f - +%s- <<< "2025-11-17T14:00"$'\nnow') 0 )) && yt-dlp https://example.com/test-video</pre>
    </article>

    <article class="script box">
      <header>
        <h2>IPTV Stream aufnehmen</h2>
      </header>
      <p>
        Livestream eines Senders für Zeit X mitschneiden. Solange es sich um einen ".m3u8" Stream handelt sollten auch andere Webseite funktionieren.<br><br>
        Links der Sender findest du bei <a target="_blank" href="https://github.com/jnk22/kodinerds-iptv/blob/master/iptv/clean/clean_tv_main.m3u">Kodi Nerds (Github)</a>
      </p>
      <p>
        <button class="codeSwitch" @click="showCodeComments.streamRecord = !showCodeComments.streamRecord">
          <span v-if="showCodeComments.streamRecord">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 15H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M8 15L10.5 12.5V12.5C10.7761 12.2239 10.7761 11.7761 10.5 11.5V11.5L8 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M3 8C3 6.11438 3 5.17157 3.58579 4.58579C4.17157 4 5.11438 4 7 4H12H17C18.8856 4 19.8284 4 20.4142 4.58579C21 5.17157 21 6.11438 21 8V12V16C21 17.8856 21 18.8284 20.4142 19.4142C19.8284 20 18.8856 20 17 20H12H7C5.11438 20 4.17157 20 3.58579 19.4142C3 18.8284 3 17.8856 3 16V12V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span>
              Befehl
            </span>
          </span>
          <span v-if="!showCodeComments.streamRecord">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 9L17 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M7 12L13 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M21 13V7C21 5.11438 21 4.17157 20.4142 3.58579C19.8284 3 18.8856 3 17 3H7C5.11438 3 4.17157 3 3.58579 3.58579C3 4.17157 3 5.11438 3 7V13C3 14.8856 3 15.8284 3.58579 16.4142C4.17157 17 5.11438 17 7 17H9H9.02322C9.31982 17 9.5955 17.1528 9.75269 17.4043L11.864 20.7824C11.9268 20.8829 12.0732 20.8829 12.136 20.7824L14.2945 17.3288C14.4223 17.1242 14.6465 17 14.8877 17H15H17C18.8856 17 19.8284 17 20.4142 16.4142C21 15.8284 21 14.8856 21 13Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span>
              Erklärung
            </span>
          </span>
        </button>
      </p>
      <pre v-show="showCodeComments.streamRecord">
<span class="c0"># Yt-dlp nutzt <span class="c1">ffmpeg</span> um <span class="c2">1h 23m 45s</span> des <span class="c3">Livestreams von ZDFneo</span> in der Datei <span class="c5">zdf_neo_aufnahme_1h_23m_45s.mp4</span> aufzunehmen.</span>

yt-dlp \
--external-downloader <span class="c1">ffmpeg</span> \
--external-downloader-args "ffmpeg:-t <span class="c2">01:23:45</span>" \
--referer "https://zdf.de/" \
-o <span class="c5">zdf_neo_aufnahme_1h_23m_45s.mp4</span> \
<span class="c3">"https://zdf-hls-16.akamaized.net/hls/live/2016499/de/veryhigh/master.m3u8"</span>
</pre>
      <pre class="cleanScript" v-show="!showCodeComments.streamRecord">
yt-dlp --external-downloader ffmpeg --external-downloader-args "ffmpeg:-t 01:23:45" --referer "https://zdf.de/" -o zdf_neo_filme_99.mp4 "https://zdf-hls-16.akamaized.net/hls/live/2016499/de/veryhigh/master.m3u8"</pre>
    </article>

    <article class="script box">
      <header>
        <h2>Serie herunterladen und nummerieren</h2>
      </header>
      <p>
        Lädt alle Videos der angegeben Webseite herunter und benennt diese automatisch "SXXEXX Titel.ext". XX Steht für eine zweistellige Zahl.<br>
        <strong>Tipp:</strong> Bei Angabe von -o "Pfad_eines_nicht_existierenden_Ordners/S01E%(video_autonumber)02d %(title)s.%(ext)s", wird der Ordner "Pfad_eines_nicht_existierenden_Ordners" automatisch angelegt und die Staffel in den Ordner heruntergeladen.<br><br>

        Info: Mehrsprachige Downloads funktionieren nur, wenn die angegeben Formate auch verfügbar sind. Vorab mit yt-dlp -F URL prüfen!
      </p>
      <p>
        <button class="codeSwitch" @click="showCodeComments.tvseriesDl = !showCodeComments.tvseriesDl">
          <span v-if="showCodeComments.tvseriesDl">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 15H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M8 15L10.5 12.5V12.5C10.7761 12.2239 10.7761 11.7761 10.5 11.5V11.5L8 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M3 8C3 6.11438 3 5.17157 3.58579 4.58579C4.17157 4 5.11438 4 7 4H12H17C18.8856 4 19.8284 4 20.4142 4.58579C21 5.17157 21 6.11438 21 8V12V16C21 17.8856 21 18.8284 20.4142 19.4142C19.8284 20 18.8856 20 17 20H12H7C5.11438 20 4.17157 20 3.58579 19.4142C3 18.8284 3 17.8856 3 16V12V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span>
              Befehl
            </span>
          </span>
          <span v-if="!showCodeComments.tvseriesDl">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 9L17 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M7 12L13 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M21 13V7C21 5.11438 21 4.17157 20.4142 3.58579C19.8284 3 18.8856 3 17 3H7C5.11438 3 4.17157 3 3.58579 3.58579C3 4.17157 3 5.11438 3 7V13C3 14.8856 3 15.8284 3.58579 16.4142C4.17157 17 5.11438 17 7 17H9H9.02322C9.31982 17 9.5955 17.1528 9.75269 17.4043L11.864 20.7824C11.9268 20.8829 12.0732 20.8829 12.136 20.7824L14.2945 17.3288C14.4223 17.1242 14.6465 17 14.8877 17H15H17C18.8856 17 19.8284 17 20.4142 16.4142C21 15.8284 21 14.8856 21 13Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span>
              Erklärung
            </span>
          </span>
        </button>
      </p>
      <pre v-show="showCodeComments.tvseriesDl">
<span class="c0"># Yt-dlp lädt alle Videos einer <span class="c2">URL/Webseite</span> herunter, und benennt diese automatisch nach angegebenem Muster.</span>

yt-dlp \
--limit-rate 2M \ <span class="c0"># Optional: Limitiert den Download auf 2 MB/s.</span>
--all-subs \ <span class="c0"># Optional: Lädt alle verfügbaren Untertitel herunter.</span>
<span class="c0"># Optional: Mehrere Sprachen herunterladen</span>
--audio-multistreams \ <span class="c0"># Muss zwingend gesetzt werden, wenn mehrere Audiospuren heruntergeladen werden.</span>
-f "bv+ba[language=<span class="c1">deu</span>]+ba[language=<span class="c1">eng</span>]" \ <span class="c0"># Optional: (bv) Bestes Video only, (ba[language=XYZ]) Beste Audio only in angegeber Sprache "<span class="c1">ISO-639-2 Code</span>"</span>
-o "<span class="c3">S01</span><span class="c5">E%(video_autonumber)02d</span> %(title)s.%(ext)s" \ <span class="c0"># <span class="c3">Manuell zu ändernde Season Nummer</span> <span class="c5">Zweistellige Episoden Nummer</span> und Videotitel ohne Ids oder sonstige Info.</span>
<span class="c2">https://www.ardmediathek.de/serie/suits/staffel-1/Y3JpZDov...2RlOA/1</span>
</pre>
      <pre class="cleanScript" v-show="!showCodeComments.tvseriesDl">
yt-dlp \
--limit-rate 2M \
--all-subs \
--audio-multistreams -f "bv+ba[language=eng]+ba[language=deu]" \
-o "S01E%(video_autonumber)02d %(title)s.%(ext)s" \
https://www.ardmediathek.de/serie/suits/staffel-1/Y3JpZDov...2RlOA/1
</pre>
    </article>
  </section>
</template>

<script lang="js" setup>
import { useInfoStore } from '@/stores/info'
import { storeToRefs } from 'pinia'

const infoStore = useInfoStore()
const { showCodeComments } = storeToRefs(infoStore)
</script>

<style scoped>
.extraInfo a {
  color: var(--main);
  text-decoration: none;
}
button.codeSwitch {
  padding-left: 3.8rem;
  position: relative;
}
button.codeSwitch svg {
  position: absolute;
  top: 50%;
  left: 2rem;
  width: 1.1em;
  height: 1.1em;
  transform: translate(-50%, -50%);
}
.script {
  margin-bottom: 5rem;
}
.script pre.cleanScript {
  border-color: var(--green);
}

.script pre {
  font-family: monospace;
  padding: 1.4rem;
  background-color: rgba(0,0,0,95);
  border: .1rem solid var(--yellow);
  border-radius: var(--borderRadius);
  overflow-x: auto;
}
.script pre .c0 {
  color: var(--lightBlue);
}
.script pre .c1 {
  color: var(--purple);
}
.script pre .c2 {
  color: var(--green);
}
.script pre .c3 {
  color: var(--yellow);
}
.script pre .c4 {
  color: var(--orange);
}
.script pre .c5 {
  color: var(--red);
}
</style>