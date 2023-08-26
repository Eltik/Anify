# Anify
Robust anime and manga web-app.

## Installation
1. Clone this repository and `cd` into the directory.
```bash
git clone https://github.com/Eltik/Anify.git
```
2. Run `npm run build`. This will install both backend and frontend `node_modules` as well as build the databases for the backend and frontend.
3. View each directory's `README.MD` file for additional installation/requirements.
4. `cd` into the `anify-manager` directory.
5. Run `npm run dev`.

## How it Works
Anify has both a backend and a frontend as you may notice from the two directories, `anify-frontend` and `anify-backend`. The first directory is a simple NextJS web server that sends request locally to the backend server. Server-side rendering becomes super easy as a result, allowing for data to be taken from that folder and then rendered server-side. This means interaction with a separate API server client-side is not needed, and CloudFlare under-attack-mode can be turned on to prevent web scraping.

## Pre-Requisites
### NodeJS
As you may expect, Anify requires NodeJS. Version 18 is recommended.
```bash
sudo apt-add-repository -r ppa:chris-lea/node.js
sudo apt update -q
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &&\
sudo apt-get install -y nodejs
```
### PostgreSQL
For database management, Anify requires PostgreSQL version 15 and some custom plugins.
```bash
# File repo config
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import repository signing key thingamajig
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update package lists
sudo apt-get update

# Install
sudo apt-get -y install postgresql-15
```
The following will add some additional functions that is required for searching and querying the database.
```bash
# Requires pg_trgm
sudo apt-get install postgresql-contrib

# Starts the service
sudo systemctl start postgresql.service

# psql shell
sudo -i -u postgres
psql

# Change password to "password"
ALTER USER postgres WITH PASSWORD 'password';

# Create custom functions. This will automatically be added
# to the backend when building the database, but it is
# recommended to add the functions manually yourself.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

create or replace function most_similar(text, text[]) returns double precision
language sql as $$
    select max(similarity($1,x)) from unnest($2) f(x)
$$;
```
### Redis
For caching purposes, Anify uses Redis to store data temporarily (usually for about a hour).
```bash
# Prerequisites
sudo apt install lsb-release

# Signing and packages and stuff
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list

# Installation
sudo apt-get update
sudo apt-get install redis

# Start
sudo redis-server

# Flushes the database
redis-cli flushall
```

## Conclusion
That's it! For more detailed information on starting up individual sources, take a look at the respected directories.