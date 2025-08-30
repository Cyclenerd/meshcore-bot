# 🤖 MeshCore Bot

This script is a command bot that connects to a MeshCore device and responds to commands received in private channels.

## Installation

1.  **Node.js**: Make sure you have Node.js installed. You can download it from [https://nodejs.org/](https://nodejs.org/) or install it on macOS with [Homebrew](https://brew.sh/) package manager:

    ```bash
    brew install node
    ```

1.  **Clone**: Clone this repo.
1.  **Dependencies**: Open a terminal in the directory of the `meshcore-bot.js` script and run:

    ```bash
    npm ci
    ```

## Usage

To run the bot use the following command:

```bash
node meshcore-bot.js [SERIAL_PORT]
```

-   `[SERIAL_PORT]` is optional. If not provided, the script will default to `/dev/cu.usbmodem1101`.

### Example

```bash
node meshcore-bot.js /dev/tty.usbmodem12345
```

### Commands

-   `.ping`: The bot will respond with "PONG! 🏓".
-   `.date`: The bot will respond with the current date and time in ISO format.
