# anify-frontend
Advanced and modern NextJS frontend web-app utilizing the full capabilities of the related Anify Backend.

## Table of Contents
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Installation
To get started with Anify Frontend, follow these steps:

1. **cd into the directory:**
```bash
$ cd anify-frontend
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
- `BACKEND_URL`: The full URL of the backend API. By default, it should be `http://localhost:3060`. Requests are made on the server side, so it is recommended to use `localhost` for lower latency.
- `AUTH_URL`: The full URL of the authentication API. By default it should be `http://localhost:3606`. Requests are made on the server side, so it is recommended to use `localhost` for lower latency.
- `M3U8_PROXY`: The m3u8 proxy self-hosted via [this](https://github.com/chaycee/M3U8Proxy) repository. Instructions on how to setup the proxy are shown on the README of the GitHub page.
- `IMAGE_PROXY`: The image proxy self-hosted via [this](https://github.com/Eltik/image-proxy) repository. Instructions on how to setup the proxy are shown on the README of the GitHub page.
View the [Configuration](#configuration) section for more information on the `.env` file.
4. **Start the web server:**
To start the server in development mode, run:
```bash
$ bun run dev
```
If you setup the web server correctly, you should be able to visit the site at [http://localhost:3000](http://localhost:3000). If you don't, view the errors in the console and change your configuration as necessary. **Make sure to run the backend server first** if you are encountering issues visiting the home page.

## Configuration
Anify Manager uses environment variables for configuration. You should create a `.env` file based on the provided `.env.example` and set the required values.

### .env.example
```env
# Backend URL (local recommended for faster responses)
BACKEND_URL="http://localhost:3060"
# Authentication URL (local recommended for faster responses)
AUTH_URL="http://localhost:3660"
# M3u8 proxy URL. To host a proxy, visit https://github.com/chaycee/M3U8Proxy
M3U8_PROXY="https://proxy.m3u8.proxy"
# Image proxy. To host a proxy, visit https://github.com/Eltik/image-proxy
IMAGE_PROXY="https://api.consumet.org/utils/image-proxy"
# Backend API key (not required)
API_KEY=""
```
Make sure to fill in the appropriate values for your setup.

## Usage
Once you have installed and configured the project, you can use the following scripts to interact with the frontend. Please note that the **backend, authentication server, m3u8 proxy, and image proxy are required to be running** in order to effectively use all pages of the frontend.

### Start the server in production mode:
If you have built a `/.next` folder, you can start the server using the built files.
```bash
$ bun start
```

### Start the server in development mode:
Uses the `/src` folder to run the server in development mode. Recommended if `bun start` is throwing errors.
```bash
$ bun dev
```

### Build Project for Production
Bundles `/src` into the `/.next` folder for production. Recommended for faster run-time.
```bash
$ bun run build
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

## Contributing
Contributions to Anify Manager are welcome. You can submit bug reports, feature requests, or even open pull requests. If you have any questions, feel free to join our [Discord](https://anify.tv/discord).

## License
This project is licensed under the MIT License. See the [LICENSE](/c/License) file for details.