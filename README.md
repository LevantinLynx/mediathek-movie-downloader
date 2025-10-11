# Mediathek Movie Downloader

## Warum?

Nachdem man in Deutschland sowieso GEZ bezahlt, dachte ich mir, warum nicht auch mal das Angebot nutzen, und eine private Sammlung der verfügbaren Filme in Jellyfin, Plex oder ähnlichem anlegen. Da das ganze manuell doch sehr aufwendig ist, vor allem, wenn mehrere Tonspuren, Untertitel etc. in eine Datei zusammen gefasst und richtig benannt werden sollen, ist automation genau das richtige.

![Mediathek Movie Downloader WebApp](https://i.imgur.com/oxSfpiK.png)

## WebApp

Der Downloader ist ganz normal über den Browser im lokalen Netzwerk erreichbar. Von einer öffentlichen Instanz kann ich nur abraten.
Es kann auf iOS Geräten über Safari > Teilen > Zum Homebildschirm hinzufügen ein Shortcut erstellt werden. (Android besitze ich nicht, wird dort wohl auch ein solche Funktion geben.)

## Setup

Zwei Ordner anlegen, einen für die Datebank/Cache der andere für die Downloads. Diese werden dann an den Docker Container weitergereicht.
Für alle Filme wird automatisch ein eigener Ordner mit Namen des Films angelegt. Darin wird dann der Film sowie dessen Untertitel abgelegt.

Beim ersten Start, entweder eine Nacht abwarten oder in den Einstellungen auf "FORCE RELOAD" klicken, um die Metadaten der Sender abzufragen.

## Docker

### Docker Run

```bash
docker run \
  -p 12345:12345 \
  -v /pfad/zum/downloads/ordner:/usr/src/app/downloads \
  -v /pfad/zum/datenbank/ordner:/usr/src/app/db \
  --restart unless-stopped \
  levantinlynx/mediathek-movie-downloader:latest
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
    volumes:
      - '/pfad/zum/downloads/ordner:/usr/src/app/downloads'
      - '/pfad/zum/datenbank/ordner:/usr/src/app/db'
      - '/pfad/zum/cache/ordner:/usr/src/app/cache'
    ports:
      - '12345:12345'
```

---

## Roadmap

- [ ] Downloads manuell per Link hinzufügen, Serien, Doku etc.
- [ ] Nützliche Scripte für ffmpeg (Zusammenfügen von Video Dateien, Umbenennen von Tonspuren …)
- [ ] Movie Ratings (imdb, tmdb oder Ähnliches…)
- [ ] Einstellungen je Download
  - [ ] Auflösung
  - [ ] Bandbreite
  - [ ] Sprachen

## Erledigt

- [x] Support für ARD Sender-Gruppe
- [x] Bilder Cache für Thumbnails

---

## Dank

Einen großen Dank an alle Kontributoren des yt-dlp Projektes, ohne die dieses Projekt nicht möglich wäre. [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

## Hinweis

Dieses Projekt ist in keiner Weise mit einem der Öffentlich-rechtlichen Sender assozisiert, noch wird es von einem Sender oder Sendergruppe unterstützt.