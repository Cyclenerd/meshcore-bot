import { Constants, NodeJSSerialConnection } from "@liamcottle/meshcore.js";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import lpp from 'cayenne-lpp';

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
        description: 'Public key prefix of the repeater to fetch telemetry from'
    })
    .option('telemetryInterval', {
        alias: 't',
        type: 'number',
        description: 'Telemetry interval in minutes',
        default: 15
    })
    .option('repeaterPassword', {
        alias: 'p',
        type: 'string',
        description: 'Repeater password',
        default: ''
    })
    .argv;

// get port from cli arguments
/*eslint no-undef: "off"*/
const port = argv.port;
const repeaterPublicKeyPrefix = argv.repeaterPublicKeyPrefix;
const repeaterPassword = argv.repeaterPassword;
const telemetryIntervalMinutes = argv.telemetryInterval;
const telemetryIntervalMs = telemetryIntervalMinutes * 60 * 1000;

console.log(`Connecting to ${port}`);
if(repeaterPublicKeyPrefix){
    console.log(`Repeater public key prefix: ${repeaterPublicKeyPrefix}`);
    console.log(`Telemetry interval: ${telemetryIntervalMinutes} minutes`);
}

// create connection
const connection = new NodeJSSerialConnection(port);

let reconnectInterval;
let telemetryInterval;

// wait until connected
connection.on("connected", async () => {

    // we are now connected
    console.log("Connected");

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

    // clear reconnect interval if it exists
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }

    if(repeaterPublicKeyPrefix){
        // Start telemetry fetching interval
        if (telemetryInterval) {
            clearInterval(telemetryInterval);
        }
        telemetryInterval = setInterval(() => getRepeaterTelemetry(repeaterPublicKeyPrefix, repeaterPassword), telemetryIntervalMs);
        getRepeaterTelemetry(repeaterPublicKeyPrefix, repeaterPassword); // Also fetch immediately on connect
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

    if (telemetryInterval) {
        clearInterval(telemetryInterval);
        telemetryInterval = null;
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
    console.log(`[${new Date().toISOString()}] Contact message`, message);
}

async function onChannelMessageReceived(message) {
    message.senderTimestampISO = (new Date(message.senderTimestamp * 1000)).toISOString();
    console.log(`[${new Date().toISOString()}] Channel message`, message);
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

async function getRepeaterTelemetry(publicKeyPrefix, repeaterPassword) {
    console.log("Fetching repeater telemetry...");
    try {
        const contact = await connection.findContactByPublicKeyPrefix(Buffer.from(publicKeyPrefix, "hex"));
        if(!contact){
            console.log("Repeater contact not found");
            return;
        }

        // login to repeater and get repeater telemetry
        console.log("Logging in to repeater...");
        await connection.login(contact.publicKey, repeaterPassword);
        console.log("Fetching telemetry...");
        const telemetry = await connection.getTelemetry(contact.publicKey);
        console.log("Repeater telemetry", telemetry);
        // Decode Cayenne LPP payload
        // https://www.thethingsindustries.com/docs/integrations/payload-formatters/cayenne/
        // https://www.npmjs.com/package/cayenne-lpp
        if (telemetry.lppSensorData) {
            const lppSensorDataBuffer = Buffer.from(telemetry.lppSensorData);
            console.log("Buffer repeater telemetry", lppSensorDataBuffer);
            try {
                const decoded = lpp.decoder.decode(lppSensorDataBuffer);
                console.log("Decoded repeater telemetry", decoded);
            } catch (e) {
                console.error("Error decoding repeater telemetry", e);
            }
        }

    } catch(e) {
        console.error("Error fetching repeater telemetry", e);
    }
}

// connect to meshcore device
try {
    await connection.connect();
} catch (e) {
    console.error("Failed to connect initially", e);
}
