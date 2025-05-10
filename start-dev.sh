#!/bin/bash
docker build -f Dockerfile-dev -t mediathek-movie-downloader:dev .

docker run --rm -it -v $(pwd):/usr/src/app \
  -e TZ=Europe/Berlin \
  -e NODE_ENV=development \
  -p 12345:12345 \
  mediathek-movie-downloader:dev /bin/sh