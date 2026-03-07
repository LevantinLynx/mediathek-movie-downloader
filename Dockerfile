# BUILD IMAGE
FROM oven/bun:1-alpine AS builder

USER bun
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --chown=bun ./package.json .
COPY --chown=bun ./bun.lock .
COPY --chown=bun ./create-pkg-file.js .
COPY --chown=bun ./index.js .
COPY --chown=bun ./src ./src
COPY --chown=bun ./client ./client

RUN bun install --frozen-lockfile --production

WORKDIR /usr/src/app/client
# Build frontend
RUN bun install --frozen-lockfile && bun run build

WORKDIR /usr/src/app
# Create clean package.json for finished container
RUN bun run create-pkg-file.js


# For now oven/bun:1-alpine over alpine base image due to sharp dependencies
# No more bun built binary... also breaks sharp
FROM oven/bun:1-alpine AS final

RUN apk add --no-cache tzdata python3 py3-pycryptodomex ffmpeg

USER bun
WORKDIR /usr/src/app

RUN mkdir /usr/src/app/db /usr/src/app/downloads

ENV NODE_ENV=production

COPY --from=builder --chown=bun /usr/src/app/pkg.json ./package.json
COPY --from=builder --chown=bun /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=bun /usr/src/app/client/dist ./www

COPY --chown=bun ./src ./src
COPY --chown=bun ./index.js .

EXPOSE 12345
CMD [ "bun", "run", "index.js" ]