<template>
  <section class="info">
    <h2>Externe Ressourcen &amp; Dank</h2>
    <h4>ffmpeg</h4>
    <p>
      Gigant unter Giganten, ich weiß nicht, wo wir heute wären ohne das <a href="https://ffmpeg.org/">ffmpeg Projekt</a> und all seiner Kontributoren.
      Ein unglaublich geiles Programm, ohne das weder Youtube, Netflix, Twitch, Jellyfin, Plex oder OBS auskommt. Auch mein bescheidenes Projekt nicht.
      Wer kann, sollte hier über eine Unterstützung in Form einer <a href="https://ffmpeg.org/donations.html">Spende</a> nachdenken.
    </p>
    <h4>yt-dlp</h4>
    <p>
      Einen großen Dank an alle Kontributoren des yt-dlp Projektes, ohne die dieses Projekt nicht möglich wäre.<br>
      <a target="_blank" href="https://github.com/yt-dlp/yt-dlp">https://github.com/yt-dlp/yt-dlp</a>
    </p>
    <h4>Menü Icons</h4>
    <p>
      Icons des Menüs sind von <a href="https://www.svgrepo.com" target="_blank">SVG Repo</a>, auch hier ein riesiger Dank an alle, die solch großartige Ressourcen frei zur Verfügung stellen!
    </p>
    <h4>Icon der WebApp/Favicon</h4>
    <p>
      <a target="_blank" href="https://www.flaticon.com/free-icons/download" title="download icons">Download icons created by iconixar - Flaticon</a><br>
      <a target="_blank" href="https://www.flaticon.com/authors/iconixar">Weitere Icons des Authors "iconixar" auf Flaticon.</a>
    </p>
  </section>
</template>

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