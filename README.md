# Mediathek Movie Downloader

## Warum?

Nachdem man in Deutschland sowieso Rundfunkbeitrag bezahlt, dachte ich mir: Warum das Angebot nicht nutzen, und eine private Sammlung der verfügbaren Filme in Jellyfin, Plex oder Ähnlichem anlegen? Da das Ganze manuell doch sehr aufwendig ist, vor allem, wenn mehrere Tonspuren, Untertitel etc. in einer Datei zusammengefasst und richtig benannt werden sollen, ist Automation genau das richtige.

![Mediathek Movie Downloader WebApp](https://i.imgur.com/4Ez1Nh2.png)

## WebApp

Der Downloader ist ganz normal über den Browser im lokalen Netzwerk erreichbar. Von einer öffentlichen Instanz kann ich nur abraten!
Es kann auf iOS-Geräten über Safari > Teilen > Zum Homebildschirm hinzufügen ein Shortcut erstellt werden. (Android besitze ich nicht, es wird dort wohl auch eine solche Funktion geben.)

## Setup

Zwei Ordner anlegen, einen für die Datenbank/Cache, den anderen für die Downloads. Diese werden dann an den Docker Container weitergereicht.
Für alle Filme wird automatisch ein eigener Ordner mit dem Namen des Films angelegt. Darin werden dann der Film sowie dessen Untertitel abgelegt.

## Docker

### Docker Run

```bash
docker run \
  -p 12345:12345 \
  -e TZ=Europe/Berlin \
  -v /pfad/zum/downloads/ordner:/usr/src/app/downloads \
  -v /pfad/zum/datenbank/ordner:/usr/src/app/db \
  -v /pfad/zum/cache/ordner:/usr/src/app/cache \
  --restart unless-stopped \
  levantinlynx/mediathek-movie-downloader:latest

# Optional hinzufügen
-e OMDB_API_KEY=XXXXXXXXXX
-e TMDB_API_READ_ACCESS_TOKEN=XXXXXXXXXX
```

### Docker Compose / Portainer

```docker
services:
  mediathek-movie-downloader:
    container_name: mediathek-movie-downloader
    image: 'levantinlynx/mediathek-movie-downloader:latest'
    restart: unless-stopped
    environment:
      - TZ=Europe/Berlin
      - OMDB_API_KEY=XXXXXXXXXX # Optional
      - TMDB_API_READ_ACCESS_TOKEN=XXXXXXXXXX # Optional
    volumes:
      - '/pfad/zum/downloads/ordner:/usr/src/app/downloads'
      - '/pfad/zum/datenbank/ordner:/usr/src/app/db'
      - '/pfad/zum/cache/ordner:/usr/src/app/cache'
    ports:
      - '12345:12345'
```

---

## Roadmap

- [ ] Option für zweite Videospur mit Deutscher Gebärdensprache (DGS)
- [ ] Downloads manuell per Link hinzufügen, Serien, Doku etc.
- [ ] Einstellungen je Download
  - [ ] Auflösung
  - [ ] Bandbreite
  - [ ] Sprachen

## In Bearbeitung
- [ ] Nützliche Skripte für ffmpeg (Zusammenfügen von Videodateien, Umbenennen von Tonspuren …)

## Erledigt

- [x] Movie Ratings und Metadaten (TMDB, IMDb & OMDb)
- [x] Automatische Generierung von Ordner- und Dateinamen für Jellyfin, Plex etc.
- [x] Automatische Generierung von movie.nfo Dateien bei Filmen mit zugeordneten Meta Daten
- [x] Support für ARD Sendergruppe
- [x] Bilder Cache für Thumbnails
- [x] Automatische Updates der yt-dlp Binary

---

## Dank

Gigant unter Giganten, ich weiß nicht, wo wir heute wären ohne das [ffmpeg Projekt](https://ffmpeg.org/) und all seiner Kontributoren. Ein unglaublich geiles Programm, ohne das weder YouTube, Netflix, Twitch, Jellyfin, Plex noch OBS auskommt. Auch mein bescheidenes Projekt nicht. Wer kann, sollte hier über eine Unterstützung in Form einer [Spende](https://ffmpeg.org/donations.html) nachdenken.

Einen großen Dank an alle Kontributoren des yt-dlp Projektes, ohne die dieses Projekt nicht möglich wäre. [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

## Hinweis

Dieses Projekt ist in keiner Weise mit einem der Öffentlich-rechtlichen Sender assoziiert, noch wird es von einem Sender oder einer Sendergruppe unterstützt.