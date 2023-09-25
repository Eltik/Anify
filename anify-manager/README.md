# anify-manager
Robust Discord bot for viewing, managing, and hosting instances of the repository.

#### Note:
To use Anify properly, you do NOT need to run the manager. This part of the project is purely for ease-of-access and for fun. The code isn't as scalable and there are likely some bugs with the manager.

## Table of Contents
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Installation
To get started with Anify Manager, follow these steps:

1. **cd into the directory:**
```bash
$ cd anify-manager
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
- `DISCORD_TOKEN`: The token of your Discord bot. Can be obtained from [Discord](http://discord.com/developers/applications).
- `GUILD_ID`: The main Discord server your bot is hosted on. Right click the server and click "Copy Guild ID". Make sure you have Developer mode on (view settings).
- `ADMIN_ROLE_ID`: The role ID that is required to run the bot's commands.
View the [Configuration](#configuration) section for more information on the `.env` file.
4. **Start the bot:**
To start the server in development mode, run:
```bash
$ bun run dev
```
If you setup the bot correctly, you should see the message `Bot is ready!`. If you don't, view the error are change your configuration as necessary.

#### Note:
As of the current Bun version, there are some issues when bundling the code. This means that `bun start` will throw an error, so running in development mode is recommended.

## Configuration
Anify Manager uses environment variables for configuration. You should create a `.env` file based on the provided `.env.example` and set the required values.

### .env.example
```env
# Discord token for the bot.
DISCORD_TOKEN="discord_token"
# Discord guild ID where the bot is invited to.
GUILD_ID="discord_guild_id"
# The role ID used for running all commands. If the user doesn't have the role,
# the bot will not respond to the command.
ADMIN_ROLE_ID="admin_role_id"
```
Make sure to fill in the appropriate values for your setup.

## Usage
Once you have installed and configured the project, you can use the following scripts to interact with the Discord bot:

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

### Lint
Lints and typechecks the `/src` directory using Prettier and tsc.
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