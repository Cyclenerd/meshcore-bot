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
    git clone "https://github.com/Cyclenerd/meshcore-bot.git"
    cd "meshcore-bot"
    ```

1.  **Dependencies**: In the directory run:

    ```bash
    npm ci --production
    ```

## Usage

To run the bot use the following command:

```bash
node meshcore-bot.js --port [SERIAL_PORT] --repeater-public-key-prefix [REPEATER_PUBLIC_KEY_PREFIX] --repeater-password [REPEATER_PASSWORD] --telemetry-interval [TELEMETRY_INTERVAL_MINUTES]
```

-   `--port` or `-s` (optional): The serial port of the MeshCore device. Defaults to `/dev/cu.usbmodem1101`.
-   `--repeater-public-key-prefix` or `-r` (optional): The public key prefix of a repeater node to fetch telemetry from. If provided, the telemetry feature is enabled.
-   `--repeater-password` or `-p` (optional): The password for the repeater. Defaults to an empty string.
-   `--telemetry-interval` or `-t` (optional): The interval in minutes to fetch telemetry data. Defaults to 15.

### Examples

**Basic:**
```bash
node meshcore-bot.js --port "/dev/ttyUSB0"
```

**With Repeater Telemetry:**
```bash
node meshcore-bot.js --port "/dev/ttyUSB0" --repeater-public-key-prefix "935c6b694200644710a374c250c76f7aed9ec2ff3e60261447d4eda7c246ce5d" --repeater-password "your-password" --telemetry-interval 5
```
This will connect to the device on `/dev/ttyUSB0` and fetch telemetry from the specified repeater every 5 minutes.

### Commands

-   `.ping`: The bot will respond with "PONG! 🏓 (*hop count*)".
-   `.date`: The bot will respond with the current date and time in ISO format.

## License

All files in this repository are under the [Apache License, Version 2.0](LICENSE) unless noted otherwise.
