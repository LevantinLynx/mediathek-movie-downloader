<template>
  <div>
    <section id="info" class="info">
      <header class="mainHeader">
        <h1>Info zu API Keys</h1>
        <div>
          <a class="button" @click="$router.go(-1)" title="Zurück">
            <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      </header>

      <article class="box">
        <header>
          <h2>Funktionsumfang</h2>
        </header>
        <p>Um den vollen Funktionsumfang des Downloaders zu nutzen, werden API Keys von OMDb &amp; The Movie Database (TMDB) benötigt.</p>
        <p>
          Ohne API Keys werden weniger Informationen für die Zuordnung der Metadaten zur automatische Benennung für Jellyfin, Plex etc. geladen,
          der Downloader kann jedoch auch ohne API Keys betrieben werden. Besonders bei Fernseh-Filmen empfielt dich die The Movie Database (TMDB) API,
          da diese deutlich bessere Ergebnisse liefert als eine IMDb Suche.
        </p>
        <p>
          <strong>HINWEIS:</strong> Wurden die API Keys in einer bereits laufenden Installation hinzugefügt, müssen für die korrekte Funktion nach dem Eintragen
          der Keys in die Environment Variablen und vor dem Neustart des Containers folgende Dateien im Datenbank Ordner gelöscht werden:
          "tmdbMovies.db", "imdbMovies.db", "tmdbSuggestions.db" & "imdbSuggestions.db".
        </p>
      </article>

      <div class="apiInfo">
        <article class="box">
          <header>
            <h2>OMDb API</h2>
          </header>
          <p>
            Ein API Key für die <a href="https://www.omdbapi.com/">OMDb API</a> kann unter <a href="https://www.omdbapi.com/apikey.aspx">https://www.omdbapi.com/apikey.aspx</a> mit einer E-Mail Adresse beantragt werden.
            Der kostenlose Account reicht für den Normalbetrieb vollkommen aus. Da es sich auch hier um ein Hobbyprojekt handelt, sollte man auch hier über eine <a href="https://www.omdbapi.com/donate.htm">Spende</a> nachdenken.
          </p>
          <p>
            Der "API Key" wird als Environment Variable in den Container gegeben. "OMDB_API_KEY=XXXXXXXX"
          </p>
        </article>
  
        <article class="box">
          <header>
            <h2>The Movie Database (TMDB) API</h2>
          </header>
          <p>
            Mehr Informationen wie man einen Read Acces Token für die API bekommt unter 
            <a href="https://developer.themoviedb.org/docs/getting-started">https://developer.themoviedb.org/docs/getting-started</a>.
          </p>
          <p>
            Account auf <a href="https://www.themoviedb.org/signup">https://www.themoviedb.org/signup</a> erstellen. Danach unter 
            <a href="https://www.themoviedb.org/settings/api">https://www.themoviedb.org/settings/api</a> eine App mit dem Developer Plan (kostenlos) anlegen.
          </p>
          <p>
            Der "API Read Access Token" wird als Environment Variable in den Container gegeben. "TMDB_API_READ_ACCESS_TOKEN=XXXXXXXX"
          </p>
        </article>
      </div>
    </section>
  </div>
</template>

<script lang="js" setup>
</script>

<style scoped>
.mainHeader {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  margin: var(--boxMargin) 0 calc(var(--boxMargin) * 2);
}
.mainHeader h1 {
  margin: 0;
}
.mainHeader a.button {
  padding: 0;
  width: 4rem;
  height: 4rem;
  aspect-ratio: 1 / 1 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--boxShadow);
}
.apiInfo {
  display: grid;
  gap: var(--boxMargin);
  margin-top: var(--boxMargin);
}

section.info p:not(:last-child) {
  margin-block: 1em;
}
section.info h4 {
  margin: calc(var(--boxMargin) * 2) 0 var(--boxMargin);
  font-size: 2rem;
  font-weight: 600;
}
article a {
  color: var(--main);
  text-decoration: none;
}

@media (width >= 1024px) {
  .apiInfo {
    grid-template-columns: 1fr 1fr;
  }
}
</style>