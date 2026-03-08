#!/bin/bash
docker build -f Dockerfile-dev -t mediathek-movie-downloader:dev .

docker run --rm -it -v $(pwd):/usr/src/app \
  -e NODE_ENV=development \
  --env-file .env \
  -p 12345:12345 \
  -p 5173:5173 \
  mediathek-movie-downloader:dev /bin/sh