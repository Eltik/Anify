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
# Database URL for PostgreSQL. If not given, will default to SQLite.
DATABASE_URL="postgresql://postgres:password@localhost:5432/?connection_limit=100"
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

# Related to subtitles and injecting custom text to all subtitles. Not required.
# Secret key for URL encryption. Allows for encrypted subtitle URLs.
SECRET_KEY="anify"
# The text to inject into all subtitles. Can be left blank.
TEXT_TO_INJECT="Provided by anify.tv"
# The distance from the injected text in seconds. 300 = 5 minutes.
DISTANCE_FROM_INJECTED_TEXT_SECONDS=300
# The cache time for subtitle URLs in seconds. 60 * 60 * 12 = 12 hours.
SUBTITLES_CACHE_TIME="60 * 60 * 12"
# Public URL for the API. Required for subtitle spoofing to work properly.
API_URL="https://api.anify.tv"
# Whether to use subtitle spoofing. Required for subtitle spoofing to work properly.
USE_SUBTITLE_SPOOFING="true"
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

## Additional Use-Cases
The following will be a basic run-down on how the backend works/certain use-cases.

### How Mapping Works
The core aspect of the backend server is the mapping. If you are curious on how mapping works, you can view [this file](https://github.com/Eltik/Anify/blob/main/anify-backend/src/lib/impl/mappings.ts). Essentially, upon requesting to map a specific media ID from one of the [base providers](https://github.com/Eltik/Anify/tree/main/anify-backend/src/mappings/impl/base), a request will be sent to fetch meta information about the media. Then, requests will be sent via each [mapping provider](https://github.com/Eltik/Anify/tree/main/anify-backend/src/mappings/impl) where the `type` and `format` match. For example, [MangaDex](https://github.com/Eltik/Anify/blob/main/anify-backend/src/mappings/impl/manga/mangadex.ts) is both a [manga](https://github.com/Eltik/Anify/tree/main/anify-backend/src/mappings/impl/manga) and [information](https://github.com/Eltik/Anify/tree/main/anify-backend/src/mappings/impl/information) provider, so requests will be sent through both files if the requested media is of type `MANGA` and has the format `MANGA` or `ONE_SHOT`. Upon mapping and receiving requests from all relevant providers, an advanced string algorithm will be run to find the best result returned based on the metadata from the base provider. For example:
```js
// Base Provider Information:
MANGADEX: ["Solo Leveling", "Only I Level up", "俺だけレベルアップな件", "Ore Dake Level Up na Ken"]

// Manga Provider Results
MANGASEE123: ["One Piece", "Only I Level up", "Mushoku Tensei", "Uchida-san wa Zettai ni Gyaru Janai!"]
COMICK: ["Shiryoku Kensa", "I’m the Max-Level Newbie", "Ore Dake Level Up na Ken"]
```
Based on the results returned, all results that don't match the title similarity within a certain threshold (ex. 0.87 similarity) will be filtered out, and the best result will be considered a correct "mapping." If that doesn't make sense, don't worry; Anify's mappings have gone through many, many recodes, with the help of quite a few other developers to get the best results possible.

### When Mappings are Created
Generally, all mappings are initially created via crawling. You can refer to [crawl script](https://github.com/Eltik/Anify/blob/main/anify-backend/src/scripts/crawl.ts) to see how it works, but all it does is fetch IDs from the [base providers](https://github.com/Eltik/Anify/tree/main/anify-backend/src/mappings/impl/base) based on the `type` and `formats` given. Then, looping through all of the IDs, starts mapping all relevant IDs and stores them in the database. Additionally, when requesting seasonal data, all not-found IDs are then mapped. You can see this in [index.ts](https://github.com/Eltik/Anify/blob/main/anify-backend/src/index.ts) file where upon the `seasonal` event being fired, all not-found IDs are mapped:
```typescript
emitter.on(Events.COMPLETED_SEASONAL_LOAD, async (data) => {
    for (let i = 0; i < (data.trending ?? []).length; i++) {
        //...
        const existing = await get(String(data.trending[i].id)); // Fetched from the database
        // If not found...
        if (!existing) {
            // Add to the mapping queue to be mapped
            queues.mappingQueue.add({
                //...
            });
        }
        //...
    }
    //...
});
```
Finally, mappings are also created via the [/search](https://github.com/Eltik/Anify/blob/main/anify-backend/src/server/impl/search.ts) and [/search-advanced](https://github.com/Eltik/Anify/blob/main/anify-backend/src/server/impl/searchAdvanced.ts) route. If no results are found when searching for a media, then the backend will start mapping once more:
```typescript
const data = await search(
    //...
);
if (data.results.length === 0) {
    queues.searchQueue.add({
        //...
    });
}
```

### Uploading/Downloading Manga/Novels
The backend server uses [Mixdrop](https://mixdrop.ag) to allow for uploading and downloading manga and novels. The system is relatively scuffed and can be significantly optimized, but if you're interested you can refer to the [pdf.ts](https://github.com/Eltik/Anify/blob/main/anify-backend/src/lib/impl/pdf.ts) and [epub.ts](https://github.com/Eltik/Anify/blob/main/anify-backend/src/lib/impl/epub.ts) files for more information. This section may or may not be updated in the future due to the current state of manga/novel pdfs/epubs.

## Contributing
Contributions to Anify Backend are welcome. You can submit bug reports, feature requests, or even open pull requests. If you have any questions, feel free to join our [Discord](https://anify.tv/discord).

## License
This project is licensed under the MIT License. See the [LICENSE](/c/License) file for details.