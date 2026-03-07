#!/bin/bash
docker build -f Dockerfile -t mediathek-movie-downloader:prod-test .

docker run --rm --env-file .env -p 12345:12345 mediathek-movie-downloader:prod-test