# anify-backend
Robust JavaScript API server for scraping anime, manga, and light novel sites.

# Information

## Scraping
Anify scrapes numerous Japanese media sites from Zoro, to GogoAnime, to AnimePahe, and more. The API is built on top of [AniSync](https://github.com/Eltik/AniSync) to map AniList information accurately, allowing for multiple providers in case one ever goes down. To avoid rate limits, the API stores information in a database to ensure fast and accurate results. This is meant to be a robust web server, so there are a ton of features from Redis caching, PostgreSQL support, configurable `.env` options, etc.
## Anime
The API supports the following anime sites:
- [x] [Zoro](https://aniwatch.to)
- [x] [GogoAnime](https://www1.gogoanime.bid/)
- [x] [AnimePahe](https://animepahe.com)
- [x] [9anime](https://9anime.pl)
- [x] [AnimeFlix](https://animeflix.live)

## Manga
The API supports the following manga sites:
- [x] [MangaDex](https://mangadex.org)
- [x] [ComicK](https://comick.app)
- [x] [MangaBuddy](https://mangabuddy.com)
- [x] [MangaSee](https://mangasee123.com)

## Novels
The API supports the following novel sites:
- [x] [NovelUpdates](https://novelupdates.com)
- [x] [JNovels](https://jnovels.com)
- [x] [NovelBuddy](https://novelbuddy.com)
- [x] [ReadLightNovels](https://readlightnovels.net)

## Meta
The API supports the following meta providers:
- [x] [Kitsu](https://kitsu.io)
- [x] [TMDB](https://www.themoviedb.org)
- [x] [TVDB](https://thetvdb.com)
- [x] [Simkl](https://simkl.com)

----

# Building the Repository
If you wish to use Anify's backend for yourself, feel free to follow the instructions below. However, a fully-populated database will NOT be provided. Support can be directed to Anify's [Discord](https://anify.tv/discord).

## Prerequisites
Anify requires at a minimum NodeJS version `16.0.0` and NPM version `8.0.0` (*untested*). For using this repository as a web server, installation is relatively simple.
1. Clone the repository via `git clone https://github.com/Eltik/Anify`.
2. `cd` into the folder (`cd anify-backend`).
3. Install `node_modules` via `npm i` or `yarn install`.
4. Setup additional dependencies such as Redis and PostgreSQL before starting the server (see below).
5. Run `npm run dev` to start the web server.

## .env File
You can configure the web server via a `.env` file (not included). Default values are shown below. The only required values are the `DATABASE_URL` and `REDIS_URL`. You may change the values below to your liking:
```
# What port to listen to
PORT="3060"
# PostgreSQL database URL
DATABASE_URL="postgresql://postgres:password@localhost:5432/?connection_limit=100"
# Whether to use Meilisearch
USE_MEILISEARCH="true"
# Meilisearch URL + Keys
MEILISEARCH_URL="http://localhost:7700"
MEILISEARCH_KEY="keylol"
# 9anime resolver URL
NINEANIME_RESOLVER="https://9anime.resolver.com"
# 9anime resolver API key
NINEANIME_KEY="9animekey"
# Redis URL
REDIS_URL="redis://localhost:6379"
# How long to cache redis data
REDIS_CACHE_TIME="18000"
# How long to cache redis data
REDIS_CACHE_TIME="18000"
# Whether to use API keys
USE_API_KEYS="true"
# Master API key for admin actions
MASTER_KEY=""
# API key whitelist
API_KEY_WHITELIST="key1,key2,key3"
# Censys ID used for finding CORS proxies https://search.censys.io/account/api
CENSYS_ID="censys_id"
# Censys secret used for finding CORS proxies https://search.censys.io/account/api
CENSYS_SECRET="censys_secret"
# Simkl API client ID
SIMKL_CLIENT_ID="simkl_client_id"
# Simkl API client secret
SIMKL_CLIENT_SECRET="simkl_client_secret"

# Mixdrop related for uploads
# Whether to use Mixdrop
USE_MIXDROP="true"
# Mixdrop Email
MIXDROP_EMAIL="myemail@outlook.com"
# Mixdrop API key
MIXDROP_KEY="mixdrop_key"
```

## Using Redis
It is highly recommended that you use Redis for caching. On MacOS, you can install Redis via Homebrew like this:
```bash
# Installation
brew install redis

# Start the server via Homebrew
brew services start redis

# Start the server via the CLI
redis-server

# Flush everything from the cache
redis-cli flushall
```
For Linux:
```bash
# Prerequisite
sudo apt install lsb-release

# Installation
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt-get update
sudo apt-get install redis

#Start the server via the CLI
redis-server
```

## Using PostegreSQL
By default, Anify uses [Prisma](https://npmjs.com/package/prisma) and [PostgreSQL](http://postgresql.org). PostgreSQL is used to make database querying, searching, etc. a lot easier. The prisma schema is located below.
```bash
├── node_modules
├── prisma
│   └── schema.prisma
├── package.json
└── other_files_here
```
Put `DATABASE_URL="postgresql://postgres:password@localhost:3306"` in the `.env` file. You can change the database URL to whatever you want, but make sure to change the `database_url` in the options path to match the URL in the `.env` file.
```bash
# .env
# The URL is formatted as postgres://{username}:{password}@{host}:{port}/{database_name}
DATABASE_URL="postgres://username:password@localhost:5432/anify"

# Here is an example that I use
DATABASE_URL="postgresql://postgres:password@localhost:3306"
```
On MacOS, you can install PostgreSQL via [Homebrew](https://brew.sh/):
```bash
# Installation
brew install postgresql
brew install postgis

# Start the server
brew services start postgresql

# Stop the server
brew services stop postgresql
```
On Linux, you can install PostgreSQL via this:
```bash
# Installation
sudo apt update
# Custom functions/pg_trgm
sudo apt install postgresql postgresql-contrib
sudo apt-get install postgresql-contrib

# Start the server
sudo systemctl start postgresql.service

# Stop the server
sudo systemctl stop postgresql.service
```
[This](https://www.postgresql.org/download/linux/ubuntu/) is helpful for installation. Make sure you install <b>at least version 15</b>.<br/>
You can then run `sudo -u postgres psql` and execute commands from there. For example, for creating a new role:
```bash
sudo -u postgres psql createuser --interactive
```
Please note that for searching via PostgreSQL, you need to get into the PSQL shell via `psql` and run:
```sql
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

create or replace function most_similar(text, text[]) returns double precision
language sql as $$
    select max(similarity($1,x)) from unnest($2) f(x)
$$;
```
The `db:extensions` script (see below) runs these for you, but it is recommended that you execute the scripts in your terminal just in case the script fails.<br />
FYI, if you have an issue running `psql` saying, "role root does not exist", run this:
```bash
sudo -i -u postgres
psql
```
Alternatively, you can try:
```bash
psql postgres
```
And then update the `.env` file with the correct database URL.<br />
Then, run the command:
```bash
npm run build:db
```
If you need help with development, join our [Discord](https://anify.tv/discord) and view the [#help](https://discord.com/channels/950964096600252507/1071533139631026287) channel.

## Contribution
This project is a work-in-progress, so contribution would be appreciated. If you'd like to contribute, feel free to open a [Pull Request](https://github.com/Eltik/Anify/pulls).

# TBD
The README for this project isn't done! Join our [Discord](https://anify.tv/discord) for more information.