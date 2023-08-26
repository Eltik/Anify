# anify-frontend
Robust NextJS server for displaying data via the backend server.

# Information
The frontend is pretty simple: using NextJS 13's server-side-rendering (SSR), requests are made to the backend locally and then displayed to the user. There isn't much else to it.

# Building the Repository
If you wish to use Anify's frontend for yourself, feel free to follow the instructions below. Installation is very simple, but if you need help support can be directed to Anify's [Discord](https://anify.tv/discord).

## Prerequisites
Anify requires at a minimum NodeJS version `16.0.0` and NPM version `8.0.0` (*untested*). For using this repository as a web server, installation is relatively simple.
1. Clone the repository via `git clone https://github.com/Eltik/Anify`.
2. `cd` into the folder (`cd anify-frontend`).
3. Install `node_modules` via `npm i` or `yarn install`.
4. Setup the `.env` file (see below).
5. Run `npm run dev` to start the web server.

## .env File
You can configure the web server via a `.env` file (not included). Default values are shown below. The only required values are the `DATABASE_URL`, `BACKEND_URL`, and `M3U8_PROXY`. You may change the values below to your liking:
```
DATABASE_URL="file:./db.sqlite"
BACKEND_URL="http://localhost:3060"
AUTH_URL="http://localhost:3660"
M3U8_PROXY="https://proxy.m3u8.proxy"
ANILIST_ID=""
ANILIST_SECRET=""
ANILIST_REDIRECT_URL="http://localhost:3000/api/auth"
IMAGE_PROXY="https://api.consumet.org/utils/image-proxy"
API_KEY=""
USE_MEILISEARCH="false"
MEILISEARCH_URL="https://search.meilisearch.com"
MEILISEARCH_KEY=""
```
Some basic documentation on `.env` values:
- `DATABASE_URL`: Used for accounts. Required for prisma to work properly.
- `BACKEND_URL`: The URL to send requests to for the backend.
- `AUTH_URL`: The URL to send requests to for authentication (see `anify-auth` directory).
- `M3U8_PROXY`: The m3u8 proxy to use. Proxy can be cloned [here](https://github.com/chaycee/M3U8Proxy).
- `ANILIST_ID`: AniList client ID for logins.
- `ANILIST_SECRET`: AniList secret for logins.
- `REDIRECT_URL`: Redirect URL for AniList logins.
- `USE_MEILISEARCH`: Whether to use meilisearch or not (recommended `false`).
- `MEILISEARCH_URL`: Meilisearch URL to use (see [here](https://www.meilisearch.com))
- `MEILISEARCH_KEY`: Meilisearch API key.

## Contribution
This project is a work-in-progress, so contribution would be appreciated. If you'd like to contribute, feel free to open a [Pull Request](https://github.com/Eltik/Anify/pulls).

# TBD
The README for this project isn't done! Join our [Discord](https://anify.tv/discord) for more information.