# yt-dlp Audio Downloader

React + Express + Docker. Paste a YouTube URL, pick a format, audio lands in a folder on your host.

## Quick start

```bash
# Clone / download this folder, then:
DOWNLOAD_DIR=/your/music/folder docker compose up --build
```

Open **http://localhost**

## Authentication

Protect the UI with HTTP Basic Auth by setting `AUTH_USER` and `AUTH_PASS`:

```bash
AUTH_USER=admin AUTH_PASS=supersecret docker compose up --build
```

Or add them to a `.env` file next to `docker-compose.yml`:

```
AUTH_USER=admin
AUTH_PASS=supersecret
DOWNLOAD_DIR=/home/you/Music/YouTube
```

Then just `docker compose up --build`.

> If `AUTH_USER` / `AUTH_PASS` are not set, the app runs **without authentication** (convenient for local use).

## Custom output directory

Set `DOWNLOAD_DIR` to any path on your host:

```bash
DOWNLOAD_DIR=~/Music/YouTube docker compose up
```

## Custom port

By default the app runs on port **80**. Override with `PORT`:

```bash
PORT=8080 docker compose up
```

## Optional subfolder

In the UI you can type a subfolder name (e.g. `podcasts`) — files go into `$DOWNLOAD_DIR/podcasts/`.

## Formats

MP3, M4A, Opus, FLAC, WAV — all re-encoded at best quality via ffmpeg.

## Project layout

```
ytdlp-docker/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile        ← Node + yt-dlp + ffmpeg
│   ├── package.json
│   └── server.js         ← Express API
└── frontend/
    ├── Dockerfile        ← Multi-stage: Node build → Nginx
    ├── nginx.conf        ← Reverse proxy + Basic Auth
    ├── docker-entrypoint.sh
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── App.css
```

## Update yt-dlp

```bash
docker compose exec backend yt-dlp -U
```


