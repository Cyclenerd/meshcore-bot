#!/usr/bin/env node

import { Constants, NodeJSSerialConnection } from "@liamcottle/meshcore.js";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';

function getTimestamp() {
    return new Date().toISOString().slice(0, -5) + 'Z';
}

const argv = yargs(hideBin(process.argv))
    .option('port', {
        alias: 's',
        type: 'string',
        description: 'Serial port to connect to',
        default: '/dev/cu.usbmodem1101'
    })
    .option('repeaterPublicKeyPrefix', {
        alias: 'r',
        type: 'string',
        description: 'Public key of the repeater to fetch status from'
    })
    .option('repeaterInterval', {
        alias: 'i',
        type: 'number',
        description: 'Repeater interval in minutes',
        default: 15
    })
    .option('repeaterPassword', {
        alias: 'p',
        type: 'string',
        description: 'Repeater password',
        default: ''
    })
    .option('csv', {
        alias: 'c',
        type: 'string',
        description: 'CSV file to log status to'
    })
    .argv;

// get port from cli arguments
/*eslint no-undef: "off"*/
const port = argv.port;
const repeaterPublicKeyPrefix = argv.repeaterPublicKeyPrefix;
const repeaterPassword = argv.repeaterPassword;
const statusIntervalMinutes = argv.repeaterInterval;
const statusIntervalMs = statusIntervalMinutes * 60 * 1000;
const csvFile = argv.csv;

console.log(`Connecting to ${port}`);
if(repeaterPublicKeyPrefix){
    console.log(`Repeater public key prefix: ${repeaterPublicKeyPrefix}`);
    console.log(`Status interval: ${statusIntervalMinutes} minutes`);
    if (csvFile) {
       console.log(`Logging status to: ${csvFile}`);
    }
}

// create connection
const connection = new NodeJSSerialConnection(port);

let reconnectInterval;
let statusInterval;

// wait until connected
connection.on("connected", async () => {

    // we are now connected
    console.log("Connected");

    // query device info
    try {
        const device = await connection.deviceQuery();
        console.log("Model:", device.manufacturerModel);
        console.log("Firmware build date:", device.firmware_build_date);
    } catch (e) {
        console.error("Error getting device info", e);
    }

    // update clock on meshcore device
    console.log("Sync Clock...");
    try {
        await connection.syncDeviceTime();
    } catch (e) {
        console.error("Error syncing device time", e);
    }

    // log contacts
    console.log("Get Contacts...");
    try {
        const contacts = await connection.getContacts();
        //console.log(`Contacts:`, contacts);
        for(const contact of contacts) {
            const typeNames = ["None", "Contact", "Repeater", "Room"];
            const typeName = typeNames[contact.type] || "Unknown";
            console.log(`${typeName}: ${contact.advName}; Public Key: ${Buffer.from(contact.publicKey).toString('hex')}`);
        }
    } catch (e) {
        console.error("Error retrieving contacts", e);
    }

    // log channels
    console.log("Get Channels...");
    try {
        const channels = await connection.getChannels();
        //console.log(`Channels:`, channels);
        for(const channel of channels) {
            if (channel.name) {
                console.log(`${channel.channelIdx}: ${channel.name}`);
            }
        }
    } catch (e) {
        console.error("Error retrieving channels", e);
    }

    // clear reconnect interval if it exists
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }

    if(repeaterPublicKeyPrefix){
        // Start  fetching interval
        if (statusInterval) {
            clearInterval(statusInterval);
        }
        statusInterval = setInterval(() => getRepeater(repeaterPublicKeyPrefix, repeaterPassword), statusIntervalMs);
        getRepeater(repeaterPublicKeyPrefix, repeaterPassword); // Also fetch immediately on connect
    }
});

// auto reconnect on disconnect
connection.on("disconnected", () => {
    console.log("Disconnected, trying to reconnect...");
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
    }
    reconnectInterval = setInterval(async () => {
        await connection.connect();
    }, 3000);

    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
});

// listen for new messages
connection.on(Constants.PushCodes.MsgWaiting, async () => {
    try {
        const waitingMessages = await connection.getWaitingMessages();
        for(const message of waitingMessages){
            if(message.contactMessage){
                await onContactMessageReceived(message.contactMessage);
            } else if(message.channelMessage) {
                await onChannelMessageReceived(message.channelMessage);
            }
        }
    } catch(e) {
        console.error("Message could not be retrieved", e);
    }
});

async function onContactMessageReceived(message) {
    console.log(`[${getTimestamp()}] Contact message`, message);
}

async function onChannelMessageReceived(message) {
    message.senderTimestampISO = (new Date(message.senderTimestamp * 1000)).toISOString();
    console.log(`[${getTimestamp()}] Channel message`, message);
    // handle commands only in own channels, not in public channel with id 0
    if(message.channelIdx > 0){
        if(message.text.includes(".ping")){
            await connection.sendChannelTextMessage(message.channelIdx, "PONG! 🏓 (" + message.pathLen + ")");
            return;
        }
        if(message.text.includes(".date")){
            await connection.sendChannelTextMessage(message.channelIdx, (new Date()).toISOString());
            return;
        }
    }
}

// listen for adverts
connection.on(Constants.PushCodes.Advert, async (advert) => {
    try {
        console.log(`[${getTimestamp()}] Advert: ${Buffer.from(advert.publicKey).toString('hex')}`);
    } catch(e) {
        console.error("Advert could not be retrieved", e);
    }
});

async function getRepeater(publicKeyPrefix, repeaterPassword) {
    console.log("Fetching repeater status...");
    try {
        const contact = await connection.findContactByPublicKeyPrefix(Buffer.from(publicKeyPrefix, "hex"));
        if(!contact){
            console.error("Repeater contact not found");
            return;
        }

        // login to repeater and get repeater status 
        console.log("Logging in to repeater...");
        await connection.login(contact.publicKey, repeaterPassword);
        // get repeater status
        console.log("Fetching status...");
        const timestamp = getTimestamp(); // Store timestamp of first fetch for CSV
        const status = await connection.getStatus(contact.publicKey);
        console.log(`[${timestamp}] Repeater status`, status);
        
        if (csvFile) {
            console.log("Write to CSV file...");
            const header = [
                'timestamp',
                'batt_milli_volts',
                'curr_tx_queue_len',
                'noise_floor',
                'last_rssi',
                'n_packets_recv',
                'n_packets_sent',
                'total_air_time_secs',
                'total_up_time_secs',
                'n_sent_flood',
                'n_sent_direct',
                'n_recv_flood',
                'n_recv_direct',
                'err_events',
                'last_snr',
                'n_direct_dups',
                'n_flood_dups'
            ].join(',') + '\n';
            const statusValues = [
                timestamp,
                status.batt_milli_volts,
                status.curr_tx_queue_len,
                status.noise_floor,
                status.last_rssi,
                status.n_packets_recv,
                status.n_packets_sent,
                status.total_air_time_secs,
                status.total_up_time_secs,
                status.n_sent_flood,
                status.n_sent_direct,
                status.n_recv_flood,
                status.n_recv_direct,
                status.err_events,
                status.last_snr,
                status.n_direct_dups,
                status.n_flood_dups
            ].join(',') + '\n';
            if (!fs.existsSync(csvFile)) {
                fs.writeFileSync(csvFile, header);
            }
            fs.appendFileSync(csvFile, statusValues);
        }
        console.log("Done, waiting for the next interval.");
    } catch(e) {
        console.error("Error fetching repeater status!", e);
    }
}

// connect to meshcore device
try {
    await connection.connect();
} catch (e) {
    console.error("Failed to connect initially", e);
}
