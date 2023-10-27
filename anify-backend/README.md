# Anify Backend
Anify Backend is an advanced anime, manga, and light novel scraping web API. It provides a robust backend infrastructure for retrieving and processing anime-related data. This README will guide you through setting up and running the project.

## Table of Contents
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Installation
To get started with Anify Backend, follow these steps:

1. **cd into the directory:**
```bash
$ cd anify-backend
```
2. **Install dependencies:**
```bash
$ bun install
```
3. **Setup `.env` file:**
You need to create a .env file based on the provided .env.example. This file contains important configuration options for your application.
```bash
$ cp .env.example .env
```
Now, open the .env file in your favorite text editor and fill in the required values:
- `PORT`: The port to listen to (recommended but not required).
- `CENSYS_ID` and `CENSYS_SECRET`: Censys API credentials for finding CORS proxies (required for proxies to work properly).
- `NINEANIME_RESOLVER` and `NINEANIME_KEY`: 9anime resolver URL and API key (required for 9anime provider to work properly).
- `REDIS_URL` and `REDIS_CACHE_TIME`: Redis configuration for caching (recommended but not required).
Optionally, configure Mixdrop-related settings if needed. View the [Configuration](#configuration) section for more information on the `.env` file.
3b. **Setup proxies:**
If you don't have any proxies crawled, make sure to run `bun run scrape:proxies`. This will crawl through all CORS proxies and store them in a JSON file.
4. **Start the server:**
To start the server in development mode, run:
```bash
$ bun run dev
```
This will launch the server on `localhost` based on the port provided.

## Configuration
Anify Backend uses environment variables for configuration. You should create a `.env` file based on the provided `.env.example` and set the required values.

### .env.example
```env
# What port to listen to. Recommended but not required.
PORT=3060
# Censys ID used for finding CORS proxies https://search.censys.io/account/api. Required for proxies to work properly.
CENSYS_ID=""
# Censys secret used for finding CORS proxies https://search.censys.io/account/api. Requirded for proxies to work properly.
CENSYS_SECRET=""
# 9anime resolver URL. Private server that can be obtained via the Consumet Discord if necessary. Required for 9anime to work properly.
# https://discord.gg/yMZTcVstD3
NINEANIME_RESOLVER="https://9anime.myresolver.com"
# 9anime resolver API key. Required for 9anime to work properly.
NINEANIME_KEY="9anime"
# Redis URL. Recommended but not required.
REDIS_URL="redis://localhost:6379"
# Redis cache time in seconds. 18000 = 5 hours. Required for Redis to work properly.
REDIS_CACHE_TIME="18000"

# Mixdrop related for uploads. Not required.
# Whether to use Mixdrop
USE_MIXDROP="true"
# Mixdrop Email
MIXDROP_EMAIL="myemail@outlook.com"
# Mixdrop API key
MIXDROP_KEY="mixdrop_key"
```
Make sure to fill in the appropriate values for your setup.

## Usage
Once you have installed and configured the project, you can use the following npm scripts to interact with the backend:

### Start the server in production mode:
If you have built a `/dist` folder, you can start the server using the bundled file.
```bash
$ bun start
```

### Start the server in development mode:
Uses the `/src` folder to run the server in development mode. Recommended if `bun start` is throwing errors.
```bash
$ bun dev
```

### Build Project for Production
Bundles `/src` into the `/dist` folder for production. Recommended for faster run-time.
```bash
$ bun run build
```

### Crawl Anime/Manga/Light Novels
Crawls through a list of IDs and populates the database. Will take a long time to complete. Arguments can be `manga`, `anime`, or `novel` for crawling specific types of media.
```bash
$ bun run crawl ("manga" / "anime" / "novel")
```

### Scrape CORS Proxies
Scrapes [Censys.io](https://search.censys.io) for CORS proxies to avoid rate limits. Stores the list in `proxies.json`.
```bash
$ bun run scrape:proxies
```

### Check CORS Proxies
Checks the `proxies.json` file (see [Scrape CORS Proxies](#scrape-cors-proxies)) and stores working CORS proxies in `goodProxies.json`. Will take a long time to complete. You may add arguments on whether to import the current proxies you've crawled through and which page to start checking at.
```bash
$ bun run check:proxies ("<import_current_proxies>") ("<page_to_start>")
```

### Export Database
Exports the database into a JSON file. An additional argument can be sent to name the export file. By default it is `database.json`.
```bash
$ bun run export ("<name>.json")
```

### Import Database
Imports a database from a given JSON file. An additional argument can be sent to import from a specific JSON file. By default it is `database.json`.
```bash
$ bun run import ("<name>.json")
```

### Wipe/Clear Database
Clears the database by deleting the anime, manga, skip times, and api key tables. **This is a dangerous action and is only recommended for development.**
```bash
$ bun run clear
```

### Lint
Lints and typechecks the `/src` directory using Prettier and eslint.
```bash
$ bun run lint
```

### Lint Using Prettier
Formats the `/src` directory using Prettier.
```bash
$ bun run prettier
```

### Lint using eslint
Lints and typechecks the `/src` directory using eslint.
```bash
$ bun run eslint
```

## Contributing
Contributions to Anify Backend are welcome. You can submit bug reports, feature requests, or even open pull requests. If you have any questions, feel free to join our [Discord](https://anify.tv/discord).

## License
This project is licensed under the MIT License. See the [LICENSE](/c/License) file for details.