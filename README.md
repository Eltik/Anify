# Anify
Robust anime, manga, and light novel web-app.

## Installation
**NOTE:** This project utilizes [Bun](https://bun.sh). Please install it before attempting to run Anify.
1. Clone this repository and `cd` into the directory.
```bash
git clone https://github.com/Eltik/Anify.git
```
2. Run `bun i`. This will install the `node_modules` dependencies for all sub-repos.
3. Run `bun run lint` and `bun run build` to build all directories.
4. View each directory's `README.MD` file for additional installation/requirements.
5. Run `bun start` to startup all services using pm2 via the `/anify-startup` directory. If you wish to individually startup a specific service, you can `cd` into a directory and run `bun start` or `bun dev`.

## How it Works
Anify's core components are the backend and frontend. Using custom mappings without the use of external API's such as [Simkl](https://simkl.com) and [MALSync](https://malsync.moe), the backend maps all types of Japanese media and gathers information before storing the mappings in a database. For creating a full-stack website, the frontend then requests data on the server-side to fetch episodes/chapters and sources/pages from the backend allowing for a smooth and secure experience watching anime and reading manga/light novels. Additionally, there is an authentication server for tracking your favorite shows and series on a preferred website.

## Basic Pre-Requisites
### Bun
As you may expect, Anify requires NodeJS. However, for performance sake, Anify utilizes [Bun](https://bun.sh) for the fastest response times possible.
```bash
curl -fsSL https://bun.sh/install | bash
```
### Redis
For caching purposes, Anify uses Redis to store data temporarily (usually for about an hour).
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