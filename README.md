# 🤖 MeshCore Bot

This script is a command bot that connects to a [MeshCore](https://github.com/meshcore-dev/MeshCore) companion radio device via serial connection and responds to commands received in private channels.

| Client | Bot |
|--------|-----|
| ![Screenshot: Client](./img/screenshot-client.jpg) | ![Screenshot: Bot Log](./img/screenshot-bot.png) |

## Installation

1.  **Node.js**: Make sure you have Node.js installed. You can download it from [https://nodejs.org/](https://nodejs.org/) or install it on macOS with [Homebrew](https://brew.sh/) package manager:

    ```bash
    brew install node
    ```

1.  **Clone**: Clone this repo:

    ```bash
    git clone "https://github.com/Cyclenerd/meshcore-bot""
    cd "meshcore-bot"
    ```

1.  **Dependencies**: In the directory run:

    ```bash
    npm ci --production
    ```

## Usage

To run the bot use the following command:

```bash
node meshcore-bot.js [SERIAL_PORT]
```

-   `[SERIAL_PORT]` is optional. If not provided, the script will default to `/dev/cu.usbmodem1101`.

### Example

```bash
node meshcore-bot.js "/dev/ttyUSB0"
```

### Commands

-   `.ping`: The bot will respond with "PONG! 🏓 (*hop count*)".
-   `.date`: The bot will respond with the current date and time in ISO format.

## License

All files in this repository are under the [Apache License, Version 2.0](LICENSE) unless noted otherwise.