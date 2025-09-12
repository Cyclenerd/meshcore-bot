# 🤖 MeshCore Bot

This script is a command bot that connects to a [MeshCore](https://github.com/meshcore-dev/MeshCore) companion radio device via USB serial connection and responds to commands received in private channels.

> [!IMPORTANT]
> To prevent spam in public channels, this bot only responds in private channels!

The bot is also able to fetch and log status (uptime, TX air time, last SNR, noise floor...) and telemetry sensor data (currently only voltage) from a repeater node.
The status and telemetry data is logged to a Comma-Separated Values (CSV) file.
The interval at which the status and telemetry data is fetched can be configured.
This bot is ideal for testing MeshCore setup with repeater and distance of communication.

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
node meshcore-bot.js --port [SERIAL_PORT] --repeater-public-key-prefix [REPEATER_PUBLIC_KEY_PREFIX] --repeater-password [REPEATER_PASSWORD] --repeater-interval [TELEMETRY_INTERVAL_MINUTES] --csv [CSV_FILE]
```

-   `--port` or `-s` (optional): The serial port of the MeshCore device. Defaults to `/dev/cu.usbmodem1101`.
-   `--repeater-public-key-prefix` or `-r` (optional): The public key prefix of a repeater node to fetch status and telemetry from. If provided, this feature is enabled.
-   `--repeater-password` or `-p` (optional): The password for the repeater. By default, this is an empty string.
-   `--repeater-interval` or `-i` (optional): The interval in minutes at which status and telemetry data is retrieved from the repeater. The default value is `15`.
-   `--csv` or `-c` (optional): The CSV file in which the repeater's status and telemetry data is to be logged. If this file is specified, the data will be logged in this file.

### Examples

**Basic:**

```bash
node meshcore-bot.js --port "/dev/ttyUSB0"
```

**With Repeater Status and Telemetry:**

```bash
node meshcore-bot.js \
--port "/dev/ttyUSB0" \
--repeater-public-key-prefix "935c6b694200644710a374c250c76f7aed9ec2ff3e60261447d4eda7c246ce5d" \
--repeater-password "your-password" \
--repeater-interval 30
```
This will connect to the device on `/dev/ttyUSB0` and fetch telemetry from the specified repeater every 30 minutes.

**With Repeater and CSV Logging:**

```bash
node meshcore-bot.js \
--port "/dev/ttyUSB0" \
--repeater-public-key-prefix "935c6b694200644710a374c250c76f7aed9ec2ff3e60261447d4eda7c246ce5d" \
--repeater-password "your-password" \
--repeater-interval 30 \
--csv "telemetry.csv"
```

This will do the same as the previous example, but it will also log the telemetry data to `telemetry.csv`.

Example CSV:

```csv
timestamp,lpp_volts,batt_milli_volts,curr_tx_queue_len,noise_floor,last_rssi,n_packets_recv,n_packets_sent,total_air_time_secs,total_up_time_secs,n_sent_flood,n_sent_direct,n_recv_flood,n_recv_direct,err_events,last_snr,n_direct_dups,n_flood_dups
2025-09-12T19:06:07Z,3.97,3969,0,-111,-59,2029,1749,1399,700263,1672,77,1514,359,0,28,0,98
2025-09-12T19:08:32Z,3.96,3969,0,-110,-60,2033,1753,1401,700407,1676,77,1515,362,0,28,0,98
```

### Commands

-   `.ping`: The bot will respond with "PONG! 🏓 (*hop count*)".
-   `.date`: The bot will respond with the current date and time in ISO format.

## License

All files in this repository are under the [Apache License, Version 2.0](LICENSE) unless noted otherwise.
