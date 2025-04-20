# Mediathek Movie Downloader

## Warum?

Nachdem man in Deutschland sowieso GEZ bezahlt, dachte ich mir, warum nicht auch mal das Angebot nutzen, und eine private Sammlung der verfügbaren Filme in Jellyfin, Plex oder ähnlichem anlegen. Nachdem das ganze manuell doch sehr aufwendig ist, vor allem, wenn mehrere Tonspuren, Untertitel etc. in eine Datei zusammen gefasst und richtig benannt werden sollen.

## Docker

```bash
docker run \
  -p 12345:12345 \
  -v /pfad/zum/downloads/ordner:/usr/src/app/downloads \
  --restart unless-stopped \
  levantinlynx/mediathek-movie-downloader:latest
```

### Docker Compose

```docker
services:
  mediathek-movie-downloader:
    image: 'levantinlynx/mediathek-movie-downloader:latest'
    restart: unless-stopped
    volumes:
      - '/pfad/zum/downloads/ordner:/usr/src/app/downloads'
    ports:
      - '12345:12345'
```

---

## Dank

Einen großen Dank an alle Kontributoren des yt-dlp Projektes, ohne die dieses Projekt nicht möglich wäre. [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

## Hinweis

Dieses Projekt ist in keiner Weise mit einem der Öffentlich-rechtlichen Sender assozisiert, noch wird es von einem Sender oder Sendergruppe unterstützt.