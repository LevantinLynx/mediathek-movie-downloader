# BUILD IMAGE
FROM oven/bun:1-alpine AS builder

USER bun
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --chown=bun ./package.json .
COPY --chown=bun ./create-pkg-file.js .
COPY --chown=bun ./bun.lock .

COPY --chown=bun ./index.js .
COPY --chown=bun ./www ./www
COPY --chown=bun ./src ./src

# Create clean package.json for finished container
RUN bun run create-pkg-file.js
RUN bun install --frozen-lockfile --production

RUN bun build ./index.js --compile --outfile download_server


FROM alpine:latest AS final

RUN apk add --no-cache tzdata python3 py3-pycryptodomex ffmpeg

ENV USER_ID=1000
ENV GROUP_ID=1000
ENV USER_NAME=downloader
ENV GROUP_NAME=downloader

RUN addgroup -g $GROUP_ID $GROUP_NAME && \
    adduser --shell /sbin/nologin --disabled-password \
    --no-create-home --uid $USER_ID --ingroup $GROUP_NAME $USER_NAME

RUN mkdir -p /usr/src/app && \
    chown $USER_NAME:$USER_NAME /usr/src/app

USER $USER_NAME
WORKDIR /usr/src/app

RUN mkdir /usr/src/app/db /usr/src/app/downloads

ENV NODE_ENV=production

COPY --from=builder --chown=$USER_NAME /usr/src/app/pkg.json ./package.json
COPY --from=builder --chown=$USER_NAME /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=$USER_NAME /usr/src/app/download_server .

COPY --chown=$USER_NAME ./www ./www
COPY --chown=$USER_NAME ./src ./src

EXPOSE 12345
CMD [ "/usr/src/app/download_server" ]