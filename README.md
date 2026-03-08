# Mediathek Movie Downloader

## Warum?

Nachdem man in Deutschland sowieso Rundfunkbeitrag bezahlt, dachte ich mir, warum das Angebot nicht nutzen, und eine private Sammlung der verfügbaren Filme in Jellyfin, Plex oder ähnlichem anlegen. Da das ganze manuell doch sehr aufwendig ist, vor allem, wenn mehrere Tonspuren, Untertitel etc. in eine Datei zusammen gefasst und richtig benannt werden sollen, ist automation genau das richtige.

![Mediathek Movie Downloader WebApp](https://i.imgur.com/y11L7iC.png)

## WebApp

Der Downloader ist ganz normal über den Browser im lokalen Netzwerk erreichbar. Von einer öffentlichen Instanz kann ich nur abraten!
Es kann auf iOS Geräten über Safari > Teilen > Zum Homebildschirm hinzufügen ein Shortcut erstellt werden. (Android besitze ich nicht, wird dort wohl auch ein solche Funktion geben.)

## Setup

Zwei Ordner anlegen, einen für die Datebank/Cache der andere für die Downloads. Diese werden dann an den Docker Container weitergereicht.
Für alle Filme wird automatisch ein eigener Ordner mit Namen des Films angelegt. Darin wird dann der Film sowie dessen Untertitel abgelegt.

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

- [ ] Option für zweite Videospur mit Deutscher Gebärden Sprache (DGS)
- [ ] Downloads manuell per Link hinzufügen, Serien, Doku etc.
- [ ] Einstellungen je Download
  - [ ] Auflösung
  - [ ] Bandbreite
  - [ ] Sprachen

## In Bearbeitung
- [ ] Nützliche Scripte für ffmpeg (Zusammenfügen von Video Dateien, Umbenennen von Tonspuren …)

## Erledigt

- [x] Movie Ratings und Meta Daten (TMDB, IMDb & OMDb)
- [x] Automatische Generierung von Ordner- und Dateinamen für Jellyfin, Plex etc.
- [x] Automatische Generierung von movie.nfo Dateien bei gematchten Filmen
- [x] Support für ARD Sender-Gruppe
- [x] Bilder Cache für Thumbnails
- [x] Automatische updates der yt-dlp Binary

---

## Dank

Gigant unter Giganten, ich weiß nicht, wo wir heute wären ohne das [ffmpeg Projekt](https://ffmpeg.org/) und all seiner Kontributoren. Ein unglaublich geiles Programm, ohne das weder Youtube, Netflix, Twitch, Jellyfin, Plex oder OBS auskommt. Auch mein bescheidenes Projekt nicht. Wer kann, sollte hier über eine Ünterstützung in Form einer [Spende](https://ffmpeg.org/donations.html) nachdenken.

Einen großen Dank an alle Kontributoren des yt-dlp Projektes, ohne die dieses Projekt nicht möglich wäre. [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

## Hinweis

Dieses Projekt ist in keiner Weise mit einem der Öffentlich-rechtlichen Sender assozisiert, noch wird es von einem Sender oder Sendergruppe unterstützt.