<template>
  <div>
    <section id="settings">
      <h1>Einstellungen</h1>
      <div class="settings">
        <div class="column">
          <article>
            <div class="box">
              <header>
                <h2>Downloader (yt-dlp)</h2>
              </header>
              <label class="top" for="maxDownloads">Max. zeitgleiche Downloads</label>
              <div class="flexGrp">
                <input type="number" min="0" max="6" id="maxDownloads" v-model="settings.maxDownloads">
              </div>
              <label class="top" for="maxDownloadRate">Max. download Rate je Download (0 = kein Limit)</label>
              <div class="flexGrp">
                <input type="number" min="0" id="maxDownloadRate" v-model="settings.maxDownloadRate"><!--
                --><select name="unit" id="unit" v-model="settings.maxDownloadRateUnit">
                  <option value="K">KB/s</option>
                  <option value="M">MB/s</option>
                  <option value="G">GB/s</option>
                </select>
              </div>

              <div>
                <p>
                  <small>
                    <strong>Info:</strong> Anzahl x Limit sollte die verfügbare Band&shy;breite nicht über&shy;steigen. Zudem sollte die Anzahl nicht höher als 3-4 sein,
                    da es ansonsten zu fehler&shy;haften Über&shy;tra&shy;gungen oder fehl&shy;schlägen der Downloads kommen kann. (Speziell wenn viele Filem
                    eines Senders gleich&shy;zeitig abgerufen werden.)
                  </small>
                </p>
              </div>

              <h4>Max. Auflösung *</h4>
              <div class="flexGrp flexSplit">
                <input type="radio" name="downloadResolutionLimit" id="downloadResolutionLimit1" value="none" v-model="settings.downloadResolutionLimit">
                <label for="downloadResolutionLimit1">Keine Begrenzung</label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="downloadResolutionLimit" id="downloadResolutionLimit2" value="360" v-model="settings.downloadResolutionLimit">
                <label for="downloadResolutionLimit2">Min <small>(640x360)</small></label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="downloadResolutionLimit" id="downloadResolutionLimit3" value="540" v-model="settings.downloadResolutionLimit">
                <label for="downloadResolutionLimit3">~SD <small>(960x540)</small></label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="downloadResolutionLimit" id="downloadResolutionLimit4" value="720" v-model="settings.downloadResolutionLimit">
                <label for="downloadResolutionLimit4">HD <small>(1280x720)</small></label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="downloadResolutionLimit" id="downloadResolutionLimit5" value="1080" v-model="settings.downloadResolutionLimit">
                <label for="downloadResolutionLimit5">FHD <small>(1920x1080)</small></label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="downloadResolutionLimit" id="downloadResolutionLimit6" value="2160" v-model="settings.downloadResolutionLimit">
                <label for="downloadResolutionLimit6">UHD/4K <small>(3840-4096x2160)</small></label>
              </div>
              <p>
                <small>
                  <strong>Achtung!</strong> Wenn das Video nur in einer höheren Auflösung verfügbar ist, schlägt der Download fehl.
                </small>
              </p>


              <h4>Benennung für Media Server</h4>
              <div class="flexGrp flexSplit">
                <input type="radio" name="fileAndFolderNaming" id="fileAndFolderNamingJellyfin" value="jellyfin" v-model="settings.fileAndFolderNaming">
                <label for="fileAndFolderNamingJellyfin">Jellyfin</label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="fileAndFolderNaming" id="fileAndFolderNamingPlex" value="plex" v-model="settings.fileAndFolderNaming">
                <label for="fileAndFolderNamingPlex">Plex</label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="fileAndFolderNaming" id="fileAndFolderNamingNoSpace" value="no_space" v-model="settings.fileAndFolderNaming">
                <label for="fileAndFolderNamingNoSpace">Unterstriche statt Leerzeichen</label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="fileAndFolderNaming" id="fileAndFolderNamingNone" value="none" v-model="settings.fileAndFolderNaming">
                <label for="fileAndFolderNamingNone">Keine (Dateien und Ordner 1:1 übernehmen)</label>
              </div>

              <p>
                <small>
                  <strong>Hinweis:</strong> Alle Änderungen gelten nur für Downloads die nach der Änderung gestartet werden. Laufende
                  Downloads können nicht beeinflusst werden! Wird der Server neu gestartet oder der Download
                  abgebrochen, wird der Download bei neustart fortgesetzt, solange der Film/Video noch
                  verfügbar ist. Beim Fortsetzen werden die dann geltenden Einstellungen berücksichtigt.
                </small>
              </p>
              <button class="button saveSettings" @click="saveSettings()">
                <svg width="2rem" height="2rem" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path id="Combined Shape" fill-rule="evenodd" clip-rule="evenodd" d="M35.2822 4.88487C34.7186 4.31826 33.9535 4 33.1551 4H6.99915C5.34286 4 3.99915 5.34372 3.99915 7V41C3.99915 42.6563 5.34286 44 6.99915 44H40.9991C42.6569 44 43.9991 42.6568 43.9991 41V14.888C43.9991 14.095 43.6861 13.3357 43.1261 12.7728L35.2822 4.88487ZM6.99915 6H12.9999V15.9508C12.9999 17.0831 13.9197 18.0028 15.0519 18.0028H32.9479C34.0802 18.0028 34.9999 17.0831 34.9999 15.9508V11.2048C34.9999 10.6525 34.5522 10.2048 33.9999 10.2048C33.4477 10.2048 32.9999 10.6525 32.9999 11.2048V15.9508C32.9999 15.9785 32.9757 16.0028 32.9479 16.0028H15.0519C15.0242 16.0028 14.9999 15.9785 14.9999 15.9508V6H33.1551C33.4211 6 33.6759 6.10599 33.8642 6.29523L41.7081 14.1831C41.8952 14.3712 41.9991 14.6234 41.9991 14.888V41C41.9991 41.5526 41.552 42 40.9991 42H6.99915C6.44743 42 5.99915 41.5517 5.99915 41V7C5.99915 6.44828 6.44743 6 6.99915 6ZM27.9999 30.0206C27.9999 27.8121 26.2089 26.0206 23.9999 26.0206C23.4477 26.0206 22.9999 25.5729 22.9999 25.0206C22.9999 24.4683 23.4477 24.0206 23.9999 24.0206C27.3136 24.0206 29.9999 26.7077 29.9999 30.0206C29.9999 33.3349 27.3142 36.0206 23.9999 36.0206C20.6857 36.0206 17.9999 33.3349 17.9999 30.0206C17.9999 29.4683 18.4477 29.0206 18.9999 29.0206C19.5522 29.0206 19.9999 29.4683 19.9999 30.0206C19.9999 32.2303 21.7902 34.0206 23.9999 34.0206C26.2097 34.0206 27.9999 32.2303 27.9999 30.0206Z" fill="currentColor"/>
                </svg><!--
                -->Speichern
              </button>
            </div>
          </article>
          <article>
            <div class="box">
              <header>
                <h2>Cache</h2>
              </header>
              <div class="flexGrp flexSplit">
                <input type="checkbox" id="enableImageCaching" v-model="settings.enableImageCaching">
                <label for="enableImageCaching">Bilder Cachen (Empfohlen)</label>
              </div>
              <p>
                <small>Werden Bilder nicht gecached, kommt es speziell bei der ARD Sendergruppe sehr häufig zu fehlenden Bildern.</small>
              </p>
              <button class="button saveSettings" @click="saveSettings()">
                <svg width="2rem" height="2rem" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path id="Combined Shape" fill-rule="evenodd" clip-rule="evenodd" d="M35.2822 4.88487C34.7186 4.31826 33.9535 4 33.1551 4H6.99915C5.34286 4 3.99915 5.34372 3.99915 7V41C3.99915 42.6563 5.34286 44 6.99915 44H40.9991C42.6569 44 43.9991 42.6568 43.9991 41V14.888C43.9991 14.095 43.6861 13.3357 43.1261 12.7728L35.2822 4.88487ZM6.99915 6H12.9999V15.9508C12.9999 17.0831 13.9197 18.0028 15.0519 18.0028H32.9479C34.0802 18.0028 34.9999 17.0831 34.9999 15.9508V11.2048C34.9999 10.6525 34.5522 10.2048 33.9999 10.2048C33.4477 10.2048 32.9999 10.6525 32.9999 11.2048V15.9508C32.9999 15.9785 32.9757 16.0028 32.9479 16.0028H15.0519C15.0242 16.0028 14.9999 15.9785 14.9999 15.9508V6H33.1551C33.4211 6 33.6759 6.10599 33.8642 6.29523L41.7081 14.1831C41.8952 14.3712 41.9991 14.6234 41.9991 14.888V41C41.9991 41.5526 41.552 42 40.9991 42H6.99915C6.44743 42 5.99915 41.5517 5.99915 41V7C5.99915 6.44828 6.44743 6 6.99915 6ZM27.9999 30.0206C27.9999 27.8121 26.2089 26.0206 23.9999 26.0206C23.4477 26.0206 22.9999 25.5729 22.9999 25.0206C22.9999 24.4683 23.4477 24.0206 23.9999 24.0206C27.3136 24.0206 29.9999 26.7077 29.9999 30.0206C29.9999 33.3349 27.3142 36.0206 23.9999 36.0206C20.6857 36.0206 17.9999 33.3349 17.9999 30.0206C17.9999 29.4683 18.4477 29.0206 18.9999 29.0206C19.5522 29.0206 19.9999 29.4683 19.9999 30.0206C19.9999 32.2303 21.7902 34.0206 23.9999 34.0206C26.2097 34.0206 27.9999 32.2303 27.9999 30.0206Z" fill="currentColor"/>
                </svg><!--
                -->Speichern
              </button>
            </div>
          </article>
        </div>
        <div class="column">
          <article>
            <div class="box">
              <header>
                <h2>Sprachen etc.</h2>
              </header>

              <h4>Bevorzugte Audiosprache</h4>
              <div class="flexGrp flexSplit">
                <input type="radio" name="preferedDownloadLanguage" id="ger" value="de" v-model="settings.preferedDownloadLanguage">
                <label for="ger">Deutsch</label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="preferedDownloadLanguage" id="eng" value="en" v-model="settings.preferedDownloadLanguage">
                <label for="eng">Englisch</label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="preferedDownloadLanguage" id="fra" value="fr" v-model="settings.preferedDownloadLanguage">
                <label for="fra">Französisch</label>
              </div>
              <h4>Audio</h4>
              <div class="flexGrp flexSplit">
                <input type="checkbox" id="includeAudioTranscription" v-model="settings.includeAudioTranscription">
                <label for="includeAudioTranscription">Tonspuren mit Audiotranskription herunterladen</label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="checkbox" id="includeClearLanguage" v-model="settings.includeClearLanguage">
                <label for="includeClearLanguage">Tonspuren mit klarer Sprache herunterladen</label>
              </div>
              <h4>Untertitel</h4>
              <div class="flexGrp flexSplit">
                <input type="checkbox" id="includeSubtitles" v-model="settings.includeSubtitles">
                <label for="includeSubtitles">Untertitel herunterladen</label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="checkbox" id="convertSubtitles" v-model="settings.convertSubtitles">
                <label for="convertSubtitles">Untertitel konvertieren wenn möglich (vtt > srt)</label>
              </div>

              <h4>Meta Daten</h4>
              <div class="flexGrp flexSplit">
                <input type="checkbox" id="generateNfoFile" v-model="settings.generateNfoFile">
                <label for="generateNfoFile">Meta Daten Datei "movie.nfo" generieren</label>
              </div>
              <button class="button saveSettings" @click="saveSettings()">
                <svg width="2rem" height="2rem" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path id="Combined Shape" fill-rule="evenodd" clip-rule="evenodd" d="M35.2822 4.88487C34.7186 4.31826 33.9535 4 33.1551 4H6.99915C5.34286 4 3.99915 5.34372 3.99915 7V41C3.99915 42.6563 5.34286 44 6.99915 44H40.9991C42.6569 44 43.9991 42.6568 43.9991 41V14.888C43.9991 14.095 43.6861 13.3357 43.1261 12.7728L35.2822 4.88487ZM6.99915 6H12.9999V15.9508C12.9999 17.0831 13.9197 18.0028 15.0519 18.0028H32.9479C34.0802 18.0028 34.9999 17.0831 34.9999 15.9508V11.2048C34.9999 10.6525 34.5522 10.2048 33.9999 10.2048C33.4477 10.2048 32.9999 10.6525 32.9999 11.2048V15.9508C32.9999 15.9785 32.9757 16.0028 32.9479 16.0028H15.0519C15.0242 16.0028 14.9999 15.9785 14.9999 15.9508V6H33.1551C33.4211 6 33.6759 6.10599 33.8642 6.29523L41.7081 14.1831C41.8952 14.3712 41.9991 14.6234 41.9991 14.888V41C41.9991 41.5526 41.552 42 40.9991 42H6.99915C6.44743 42 5.99915 41.5517 5.99915 41V7C5.99915 6.44828 6.44743 6 6.99915 6ZM27.9999 30.0206C27.9999 27.8121 26.2089 26.0206 23.9999 26.0206C23.4477 26.0206 22.9999 25.5729 22.9999 25.0206C22.9999 24.4683 23.4477 24.0206 23.9999 24.0206C27.3136 24.0206 29.9999 26.7077 29.9999 30.0206C29.9999 33.3349 27.3142 36.0206 23.9999 36.0206C20.6857 36.0206 17.9999 33.3349 17.9999 30.0206C17.9999 29.4683 18.4477 29.0206 18.9999 29.0206C19.5522 29.0206 19.9999 29.4683 19.9999 30.0206C19.9999 32.2303 21.7902 34.0206 23.9999 34.0206C26.2097 34.0206 27.9999 32.2303 27.9999 30.0206Z" fill="currentColor"/>
                </svg><!--
                -->Speichern
              </button>
            </div>
          </article>
          <article>
            <div class="box">
              <header>
                <h2>Sender Auswahl</h2>
              </header>
              <p v-if="nextMetaDataUpdateDate">
                Nächster geplanter Abruf: <strong>{{ new Date(nextMetaDataUpdateDate).toLocaleString('de-DE') }} Uhr</strong>
              </p>
              <h4>
                {{ settings.channelSelection?.filter(x => x.active)?.length }} Sender ausgewählt
              </h4>
              <div class="channelSelect">
                <div class="flexGrp flexSplit" v-for="channel in settings.channelSelection">
                  <input
                    type="checkbox"
                    :name="channel.name.toLowerCase().replace(' ', '_')"
                    :id="'channel_selection_' + channel.name.toLowerCase().replace(' ', '_')"
                    v-model="channel.active">
                  <label :for="'channel_selection_' + channel.name.toLowerCase().replace(' ', '_')">
                    {{ channel.name }}
                  </label>
                </div>
              </div>
              <p>
                <small>
                  Wird ein Channel deaktiviert, bei dem Downloads geplant sind, werden diese Filme trotzdem heruntergeladen.
                  Die Meta Daten werden jedoch weder geladen, noch können diese weiter angezeigt werden.
                </small>
              </p>
              <button class="button saveSettings" @click="saveSettings()">
                <svg width="2rem" height="2rem" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path id="Combined Shape" fill-rule="evenodd" clip-rule="evenodd" d="M35.2822 4.88487C34.7186 4.31826 33.9535 4 33.1551 4H6.99915C5.34286 4 3.99915 5.34372 3.99915 7V41C3.99915 42.6563 5.34286 44 6.99915 44H40.9991C42.6569 44 43.9991 42.6568 43.9991 41V14.888C43.9991 14.095 43.6861 13.3357 43.1261 12.7728L35.2822 4.88487ZM6.99915 6H12.9999V15.9508C12.9999 17.0831 13.9197 18.0028 15.0519 18.0028H32.9479C34.0802 18.0028 34.9999 17.0831 34.9999 15.9508V11.2048C34.9999 10.6525 34.5522 10.2048 33.9999 10.2048C33.4477 10.2048 32.9999 10.6525 32.9999 11.2048V15.9508C32.9999 15.9785 32.9757 16.0028 32.9479 16.0028H15.0519C15.0242 16.0028 14.9999 15.9785 14.9999 15.9508V6H33.1551C33.4211 6 33.6759 6.10599 33.8642 6.29523L41.7081 14.1831C41.8952 14.3712 41.9991 14.6234 41.9991 14.888V41C41.9991 41.5526 41.552 42 40.9991 42H6.99915C6.44743 42 5.99915 41.5517 5.99915 41V7C5.99915 6.44828 6.44743 6 6.99915 6ZM27.9999 30.0206C27.9999 27.8121 26.2089 26.0206 23.9999 26.0206C23.4477 26.0206 22.9999 25.5729 22.9999 25.0206C22.9999 24.4683 23.4477 24.0206 23.9999 24.0206C27.3136 24.0206 29.9999 26.7077 29.9999 30.0206C29.9999 33.3349 27.3142 36.0206 23.9999 36.0206C20.6857 36.0206 17.9999 33.3349 17.9999 30.0206C17.9999 29.4683 18.4477 29.0206 18.9999 29.0206C19.5522 29.0206 19.9999 29.4683 19.9999 30.0206C19.9999 32.2303 21.7902 34.0206 23.9999 34.0206C26.2097 34.0206 27.9999 32.2303 27.9999 30.0206Z" fill="currentColor"/>
                </svg><!--
                -->Speichern
              </button>
            </div>
          </article>
        </div>
        <div class="column">
          <article>
            <div class="box">
              <header>
                <h2>Sortierung &amp; Navigation</h2>
              </header>

              <h4>Filme sortieren nach:</h4>
              <div class="flexGrp flexSplit">
                <input type="radio" name="movieSortOrder" id="sortMovieDate" value="date" v-model="settings.movieSortOrder">
                <label for="sortMovieDate">Datum (ab &amp; bis)</label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="movieSortOrder" id="sortMovieTitle" value="title" v-model="settings.movieSortOrder">
                <label for="sortMovieTitle">Titel (A-Z)</label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="movieSortOrder" id="sortMovieChannel" value="channel" v-model="settings.movieSortOrder">
                <label for="sortMovieChannel">Channel (A-Z)</label>
              </div>
              <div class="flexGrp flexSplit">
                <input type="radio" name="movieSortOrder" id="sortMovieNone" value="none" v-model="settings.movieSortOrder">
                <label for="sortMovieNone">Keine</label>
              </div>

              <h4>Navigation</h4>
              <div class="flexGrp flexSplit">
                <input type="checkbox" id="autoNavigateOnDownloadAndIgnore" v-model="settings.autoNavigateOnDownloadAndIgnore">
                <label for="autoNavigateOnDownloadAndIgnore">Bei Download oder Ignorieren automatisch den nächsten Film statt der Übersicht laden.</label>
              </div>

              <button class="button saveSettings" @click="saveSettings()">
                <svg width="2rem" height="2rem" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path id="Combined Shape" fill-rule="evenodd" clip-rule="evenodd" d="M35.2822 4.88487C34.7186 4.31826 33.9535 4 33.1551 4H6.99915C5.34286 4 3.99915 5.34372 3.99915 7V41C3.99915 42.6563 5.34286 44 6.99915 44H40.9991C42.6569 44 43.9991 42.6568 43.9991 41V14.888C43.9991 14.095 43.6861 13.3357 43.1261 12.7728L35.2822 4.88487ZM6.99915 6H12.9999V15.9508C12.9999 17.0831 13.9197 18.0028 15.0519 18.0028H32.9479C34.0802 18.0028 34.9999 17.0831 34.9999 15.9508V11.2048C34.9999 10.6525 34.5522 10.2048 33.9999 10.2048C33.4477 10.2048 32.9999 10.6525 32.9999 11.2048V15.9508C32.9999 15.9785 32.9757 16.0028 32.9479 16.0028H15.0519C15.0242 16.0028 14.9999 15.9785 14.9999 15.9508V6H33.1551C33.4211 6 33.6759 6.10599 33.8642 6.29523L41.7081 14.1831C41.8952 14.3712 41.9991 14.6234 41.9991 14.888V41C41.9991 41.5526 41.552 42 40.9991 42H6.99915C6.44743 42 5.99915 41.5517 5.99915 41V7C5.99915 6.44828 6.44743 6 6.99915 6ZM27.9999 30.0206C27.9999 27.8121 26.2089 26.0206 23.9999 26.0206C23.4477 26.0206 22.9999 25.5729 22.9999 25.0206C22.9999 24.4683 23.4477 24.0206 23.9999 24.0206C27.3136 24.0206 29.9999 26.7077 29.9999 30.0206C29.9999 33.3349 27.3142 36.0206 23.9999 36.0206C20.6857 36.0206 17.9999 33.3349 17.9999 30.0206C17.9999 29.4683 18.4477 29.0206 18.9999 29.0206C19.5522 29.0206 19.9999 29.4683 19.9999 30.0206C19.9999 32.2303 21.7902 34.0206 23.9999 34.0206C26.2097 34.0206 27.9999 32.2303 27.9999 30.0206Z" fill="currentColor"/>
                </svg><!--
                -->Speichern
              </button>
            </div>
          </article>
          <article>
            <div class="box">
              <header>
                <h2>Movie Matcher &amp; Daten</h2>
              </header>
              <h4 style="display: flex;gap: 1rem;justify-content: space-between;">Hinterlegte API Keys <RouterLink to="/settings/apikeys"><IconInfo style="width: 1.2em;vertical-align: bottom;" /> Info</RouterLink></h4>
              <div class="externalApiInfo">
                <div>
                  <IconCheckmark v-if="settings.omdbApiKeyExists" class="exists"/>
                  <IconCross v-else/>
                  <span>OMDB API Key</span>
                </div>
                <div>
                  <IconCheckmark v-if="settings.tmdbApiReadAccessTokenExists" class="exists"/>
                  <IconCross v-else/>
                  <span>TMDB API Read Access Token</span>
                </div>
              </div>

              <h4>Standard Matcher Auswahl</h4>
              <div class="matcher">
                <input type="radio" name="defaultMatcher" id="defaultMatcherTmdb" value="tmdb" v-model="settings.defaultMatcher">
                <label for="defaultMatcherTmdb"><img src="/logo/tmdb.svg" alt="TMDB"></label>
                <input type="radio" name="defaultMatcher" id="defaultMatcherImdb" value="imdb" v-model="settings.defaultMatcher">
                <label for="defaultMatcherImdb"><img src="/logo/imdb.svg" alt="IMDB"></label>
              </div>

              <button class="button saveSettings" @click="saveSettings()">
                <svg width="2rem" height="2rem" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path id="Combined Shape" fill-rule="evenodd" clip-rule="evenodd" d="M35.2822 4.88487C34.7186 4.31826 33.9535 4 33.1551 4H6.99915C5.34286 4 3.99915 5.34372 3.99915 7V41C3.99915 42.6563 5.34286 44 6.99915 44H40.9991C42.6569 44 43.9991 42.6568 43.9991 41V14.888C43.9991 14.095 43.6861 13.3357 43.1261 12.7728L35.2822 4.88487ZM6.99915 6H12.9999V15.9508C12.9999 17.0831 13.9197 18.0028 15.0519 18.0028H32.9479C34.0802 18.0028 34.9999 17.0831 34.9999 15.9508V11.2048C34.9999 10.6525 34.5522 10.2048 33.9999 10.2048C33.4477 10.2048 32.9999 10.6525 32.9999 11.2048V15.9508C32.9999 15.9785 32.9757 16.0028 32.9479 16.0028H15.0519C15.0242 16.0028 14.9999 15.9785 14.9999 15.9508V6H33.1551C33.4211 6 33.6759 6.10599 33.8642 6.29523L41.7081 14.1831C41.8952 14.3712 41.9991 14.6234 41.9991 14.888V41C41.9991 41.5526 41.552 42 40.9991 42H6.99915C6.44743 42 5.99915 41.5517 5.99915 41V7C5.99915 6.44828 6.44743 6 6.99915 6ZM27.9999 30.0206C27.9999 27.8121 26.2089 26.0206 23.9999 26.0206C23.4477 26.0206 22.9999 25.5729 22.9999 25.0206C22.9999 24.4683 23.4477 24.0206 23.9999 24.0206C27.3136 24.0206 29.9999 26.7077 29.9999 30.0206C29.9999 33.3349 27.3142 36.0206 23.9999 36.0206C20.6857 36.0206 17.9999 33.3349 17.9999 30.0206C17.9999 29.4683 18.4477 29.0206 18.9999 29.0206C19.5522 29.0206 19.9999 29.4683 19.9999 30.0206C19.9999 32.2303 21.7902 34.0206 23.9999 34.0206C26.2097 34.0206 27.9999 32.2303 27.9999 30.0206Z" fill="currentColor"/>
                </svg><!--
                -->Speichern
              </button>
            </div>
          </article>
          <article>
            <div class="box">
              <header>
                <h2>Funktionen manuel ausführen</h2>
              </header>
              <p>
                <small><strong>Achtung:</strong> Einige APIs geben unvollständige Daten zurück,
                wenn innerhalb der Jugendschutzzeiten (6-23 Uhr) abgerufen wird!</small>
              </p>
              <p>
                <small>Die Funktion "Meta Daten laden" löscht alle gecachten Meta und EPG Daten und fragt alle informationen erneut an.
                Dieser Vorgang dauert je nach Internetverbindung bis zu 5 Minuten.</small>
              </p>
              <div class="actions">
                <button class="button forceReload" @click="forceMetaDataUpdate()">
                  <svg width="2rem" height="2rem" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.28571 19C3.91878 19 2 17.1038 2 14.7647C2 12.4256 3.91878 10.5294 6.28571 10.5294C6.56983 10.5294 6.8475 10.5567 7.11616 10.6089M14.381 8.02721C14.9767 7.81911 15.6178 7.70588 16.2857 7.70588C16.9404 7.70588 17.5693 7.81468 18.1551 8.01498M7.11616 10.6089C6.88706 9.9978 6.7619 9.33687 6.7619 8.64706C6.7619 5.52827 9.32028 3 12.4762 3C15.4159 3 17.8371 5.19371 18.1551 8.01498M7.11616 10.6089C7.68059 10.7184 8.20528 10.9374 8.66667 11.2426M18.1551 8.01498C20.393 8.78024 22 10.8811 22 13.3529C22 16.0599 20.0726 18.3221 17.5 18.8722" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M12 22V16M12 22L14 20M12 22L10 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg><!--
                  -->META DATEN LADEN
                </button>
                <button class="button runAction" @click="runDownloadCheck()">
                  <svg width="2rem" height="2rem" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M15.4137 10.941C16.1954 11.4026 16.1954 12.5974 15.4137 13.059L10.6935 15.8458C9.93371 16.2944 9 15.7105 9 14.7868L9 9.21316C9 8.28947 9.93371 7.70561 10.6935 8.15419L15.4137 10.941Z" stroke="currentColor" stroke-width="1.5"/>
                  </svg><!--
                  -->DOWNLOAD
                </button>
                <button class="button" @click="runYtdlpUpdateCheck()">
                  <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 21.75C13.4142 21.75 13.75 21.4142 13.75 21C13.75 20.5858 13.4142 20.25 13 20.25V21.75ZM3.17157 19.8284L3.7019 19.2981H3.7019L3.17157 19.8284ZM20.8284 4.17157L20.2981 4.7019V4.7019L20.8284 4.17157ZM21.25 13C21.25 13.4142 21.5858 13.75 22 13.75C22.4142 13.75 22.75 13.4142 22.75 13H21.25ZM10 3.75H14V2.25H10V3.75ZM2.75 13V12H1.25V13H2.75ZM2.75 12V11H1.25V12H2.75ZM13 20.25H10V21.75H13V20.25ZM21.25 11V12H22.75V11H21.25ZM1.25 13C1.25 14.8644 1.24841 16.3382 1.40313 17.489C1.56076 18.6614 1.89288 19.6104 2.64124 20.3588L3.7019 19.2981C3.27869 18.8749 3.02502 18.2952 2.88976 17.2892C2.75159 16.2615 2.75 14.9068 2.75 13H1.25ZM10 20.25C8.09318 20.25 6.73851 20.2484 5.71085 20.1102C4.70476 19.975 4.12511 19.7213 3.7019 19.2981L2.64124 20.3588C3.38961 21.1071 4.33855 21.4392 5.51098 21.5969C6.66182 21.7516 8.13558 21.75 10 21.75V20.25ZM14 3.75C15.9068 3.75 17.2615 3.75159 18.2892 3.88976C19.2952 4.02502 19.8749 4.27869 20.2981 4.7019L21.3588 3.64124C20.6104 2.89288 19.6614 2.56076 18.489 2.40313C17.3382 2.24841 15.8644 2.25 14 2.25V3.75ZM22.75 11C22.75 9.13558 22.7516 7.66182 22.5969 6.51098C22.4392 5.33855 22.1071 4.38961 21.3588 3.64124L20.2981 4.7019C20.7213 5.12511 20.975 5.70476 21.1102 6.71085C21.2484 7.73851 21.25 9.09318 21.25 11H22.75ZM10 2.25C8.13558 2.25 6.66182 2.24841 5.51098 2.40313C4.33856 2.56076 3.38961 2.89288 2.64124 3.64124L3.7019 4.7019C4.12511 4.27869 4.70476 4.02502 5.71085 3.88976C6.73851 3.75159 8.09318 3.75 10 3.75V2.25ZM2.75 11C2.75 9.09318 2.75159 7.73851 2.88976 6.71085C3.02502 5.70476 3.27869 5.12511 3.7019 4.7019L2.64124 3.64124C1.89288 4.38961 1.56076 5.33855 1.40313 6.51098C1.24841 7.66182 1.25 9.13558 1.25 11H2.75ZM2 12.75H22V11.25H2V12.75ZM21.25 12V13H22.75V12H21.25Z" fill="currentColor"/>
                    <path d="M13.5 7.5L18 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M6 17.5L6 15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M6 8.5L6 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M9 17.5L9 15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M9 8.5L9 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M15.5841 17.5H14.8341V17.5L15.5841 17.5ZM15.5841 18L15.0964 18.5698C15.3772 18.8101 15.7911 18.8101 16.0718 18.5698L15.5841 18ZM16.656 18.0698C16.9706 17.8004 17.0074 17.327 16.738 17.0123C16.4687 16.6976 15.9952 16.6609 15.6806 16.9302L16.656 18.0698ZM15.4877 16.9302C15.173 16.6609 14.6996 16.6976 14.4302 17.0123C14.1609 17.327 14.1976 17.8004 14.5123 18.0698L15.4877 16.9302ZM20.3892 16.6352C20.6296 16.9726 21.0979 17.0512 21.4352 16.8108C21.7726 16.5704 21.8512 16.1021 21.6108 15.7648L20.3892 16.6352ZM18.5048 14.25C16.5912 14.25 14.8341 15.5999 14.8341 17.5H16.3341C16.3341 16.6387 17.1923 15.75 18.5048 15.75V14.25ZM14.8341 17.5L14.8341 18L16.3341 18L16.3341 17.5L14.8341 17.5ZM16.0718 18.5698L16.656 18.0698L15.6806 16.9302L15.0964 17.4302L16.0718 18.5698ZM16.0718 17.4302L15.4877 16.9302L14.5123 18.0698L15.0964 18.5698L16.0718 17.4302ZM21.6108 15.7648C20.945 14.8304 19.782 14.25 18.5048 14.25V15.75C19.3411 15.75 20.0295 16.1304 20.3892 16.6352L21.6108 15.7648Z" fill="currentColor"/>
                    <path d="M18.4952 21V21.75V21ZM21.4159 18.5H22.1659H21.4159ZM21.4159 18L21.9036 17.4302C21.6228 17.1899 21.2089 17.1899 20.9282 17.4302L21.4159 18ZM20.344 17.9302C20.0294 18.1996 19.9926 18.673 20.262 18.9877C20.5313 19.3024 21.0048 19.3391 21.3194 19.0698L20.344 17.9302ZM21.5123 19.0698C21.827 19.3391 22.3004 19.3024 22.5698 18.9877C22.8391 18.673 22.8024 18.1996 22.4877 17.9302L21.5123 19.0698ZM16.6108 19.3648C16.3704 19.0274 15.9021 18.9488 15.5648 19.1892C15.2274 19.4296 15.1488 19.8979 15.3892 20.2352L16.6108 19.3648ZM18.4952 21.75C20.4088 21.75 22.1659 20.4001 22.1659 18.5H20.6659C20.6659 19.3613 19.8077 20.25 18.4952 20.25V21.75ZM22.1659 18.5V18H20.6659V18.5H22.1659ZM20.9282 17.4302L20.344 17.9302L21.3194 19.0698L21.9036 18.5698L20.9282 17.4302ZM20.9282 18.5698L21.5123 19.0698L22.4877 17.9302L21.9036 17.4302L20.9282 18.5698ZM15.3892 20.2352C16.055 21.1696 17.218 21.75 18.4952 21.75V20.25C17.6589 20.25 16.9705 19.8696 16.6108 19.3648L15.3892 20.2352Z" fill="currentColor"/>
                  </svg><!--
                  -->YT-DLP UPDATE
                </button>
              </div>
            </div>
          </article>
          <article>
            <div class="box">
              <header>
                <h2>DEBUGGING</h2>
              </header>
              <p>
                Diese Option aktiviert Debug Logs. NICHT im Normalbetrieb verwenden!
                Wenn diese Option aktiviert ist werden excessiv viel Logs generiert!
              </p>
              <div class="flexGrp flexSplit">
                <input type="checkbox" id="debugLogsEnabled" v-model="settings.debugLogsEnabled">
                <label for="debugLogsEnabled">Debug Logs</label>
              </div>
              <button class="button saveSettings" @click="saveSettings()">
                <svg width="2rem" height="2rem" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path id="Combined Shape" fill-rule="evenodd" clip-rule="evenodd" d="M35.2822 4.88487C34.7186 4.31826 33.9535 4 33.1551 4H6.99915C5.34286 4 3.99915 5.34372 3.99915 7V41C3.99915 42.6563 5.34286 44 6.99915 44H40.9991C42.6569 44 43.9991 42.6568 43.9991 41V14.888C43.9991 14.095 43.6861 13.3357 43.1261 12.7728L35.2822 4.88487ZM6.99915 6H12.9999V15.9508C12.9999 17.0831 13.9197 18.0028 15.0519 18.0028H32.9479C34.0802 18.0028 34.9999 17.0831 34.9999 15.9508V11.2048C34.9999 10.6525 34.5522 10.2048 33.9999 10.2048C33.4477 10.2048 32.9999 10.6525 32.9999 11.2048V15.9508C32.9999 15.9785 32.9757 16.0028 32.9479 16.0028H15.0519C15.0242 16.0028 14.9999 15.9785 14.9999 15.9508V6H33.1551C33.4211 6 33.6759 6.10599 33.8642 6.29523L41.7081 14.1831C41.8952 14.3712 41.9991 14.6234 41.9991 14.888V41C41.9991 41.5526 41.552 42 40.9991 42H6.99915C6.44743 42 5.99915 41.5517 5.99915 41V7C5.99915 6.44828 6.44743 6 6.99915 6ZM27.9999 30.0206C27.9999 27.8121 26.2089 26.0206 23.9999 26.0206C23.4477 26.0206 22.9999 25.5729 22.9999 25.0206C22.9999 24.4683 23.4477 24.0206 23.9999 24.0206C27.3136 24.0206 29.9999 26.7077 29.9999 30.0206C29.9999 33.3349 27.3142 36.0206 23.9999 36.0206C20.6857 36.0206 17.9999 33.3349 17.9999 30.0206C17.9999 29.4683 18.4477 29.0206 18.9999 29.0206C19.5522 29.0206 19.9999 29.4683 19.9999 30.0206C19.9999 32.2303 21.7902 34.0206 23.9999 34.0206C26.2097 34.0206 27.9999 32.2303 27.9999 30.0206Z" fill="currentColor"/>
                </svg><!--
                -->Speichern
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
    <Credits />
    <Changelog />
  </div>
</template>

<script lang="js" setup>
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'
import { socket } from '@/socket'

import IconCheckmark from '@/components/icons/IconCheckmark.vue'
import IconCross from '@/components/icons/IconCross.vue'
import IconInfo from '@/components/icons/IconInfo.vue'

import Credits from '@/components/Credits.vue'
import Changelog from '@/components/Changelog.vue'

const settingsStore = useSettingsStore()
const {
  settings,
  nextMetaDataUpdateDate
} = storeToRefs(settingsStore)

function saveSettings () {
  socket.emit('updateSettings', settings.value)
}
function forceMetaDataUpdate () {
  socket.emit('forceMetaDataUpdate')
}
function runDownloadCheck () {
  socket.emit('runDownloadCheck')
}
function runYtdlpUpdateCheck () {
  socket.emit('runYtdlpUpdateCheck')
}
</script>

<style scoped>
a {
  display: inline-block;
  color: var(--main);
  text-decoration: none;
}

.settings {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(34rem, 1fr));
  gap: var(--boxMargin);
}
.settings label {
  display: block;
  user-select: none;
}
.settings select {
  appearance: none;
  outline: none;
  border: none;
  padding-inline: 1rem 3rem;
  color: var(--buttonColor);
  background: var(--buttonBg);
  height: 4rem;

  background-image: url(/imgs/arrow-down.svg);
  background-position-y: center;
  background-position-x: 5.3rem;
  background-size: 2rem;
  background-repeat: no-repeat;
  font-size: 1.7rem;
}
.settings small {
  font-size: 1.4rem;
  font-style: italic;
}
.settings .flexSplit input {
  flex-grow: 0;
  margin: 0;
  width: 1em;
  height: 1em;
}
.settings .flexSplit input + label {
  flex: 1;
}
.settings .flexSplit {
  gap: 1rem;
  align-items: center;
}
.matcher {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1em;
  margin-bottom: 1em;
}
.matcher input[type="radio"] {
  position: absolute;
  top: 0;
  left: 0;
  visibility: hidden;
}
.matcher label {
  height: 5rem;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0,0,0,.1);
  border: .1rem solid rgba(0,0,0,.25);
  transition: border 200ms ease-in-out,
    background 200ms ease-in-out;
  border-radius: var(--borderRadius);
  padding: 1.4rem;
}
.matcher input[type="radio"]:checked + label {
  border-color: var(--green);
  background-color: rgba(0,0,0,.15);
}
.matcher input[type="radio"]:not(:checked):hover + label {
  border-color: var(--purple);
  cursor: pointer;
}
.matcher img {
  width: 100%;
  max-width: 8rem;
  max-height: 2.2rem;
}
.settings .top,
.settings h4 {
  font-weight: 600;
}
.settings .top,
.settings h4 {
  margin-bottom: 1.4rem;
}
.settings .top:not(:first-child),
.settings h4:not(:first-child) {
  margin-top: 2.4rem;
}
.settings .actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 3rem;
}
.settings .button {
  display: block;
  position: relative;
  padding-left: 3.8rem;
  padding-right: 1.2rem;
}
.settings .button svg {
  position: absolute;
  top: 50%;
  transform: translate(-50%, calc(-50% - 1px));
  margin: 0;
  left: 2rem;
  width: 2.2rem;
  height: 2.2rem;
}
.settings .column {
  display: flex;
  flex-direction: column;
  gap: var(--boxMargin);
}

.grp {
  display: grid;
  grid-template-columns: auto 14rem;
}
.grp:not(:last-child) {
  margin-bottom: 1.6rem;
}

input[type="number"] {
  padding: 2rem 1rem;
  line-height: 0;
  height: 0;
  text-align: right;
}
.flexGrp {
  margin-block: .6rem 1em;
  display: flex;
  border-radius: var(--borderRadius);
  overflow: hidden;
}
.flexGrp:last-child {
  margin-bottom: 0;
}
.flexGrp:only-child {
  margin: 0;
}
.flexGrp input {
  flex-grow: 1;
  max-width: 100%;
}
.channelSelect {
  display: grid;
  gap: 1.4rem 2rem;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 2rem;
}
.channelSelect .flexGrp {
  margin: 0;
}

.grp input,
.grp label {
  padding: 2rem;
  line-height: 0;
  height: 0;
}
.grp input {
  padding: 2rem 1.5rem;
  border: .1rem solid var(--bg1);
}

.externalApiInfo {
  display: flex;
  gap: 1rem;
  flex-direction: column;
}
.externalApiInfo > div {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.externalApiInfo svg {
  width: 2rem;
  height: 2rem;
  background-color: var(--red);
  border-radius: var(--borderRadius);
  stroke-width: .2rem;
}
.externalApiInfo svg.exists {
  background-color: var(--green);
  color: #000;
}
</style>