import { Constants, NodeJSSerialConnection } from "@liamcottle/meshcore.js";

// get port from cli arguments
/*eslint no-undef: "off"*/
const port = process.argv[2] || "/dev/cu.usbmodem1101";
const repeaterPublicKeyPrefix = process.argv[3];
const telemetryIntervalMinutes = process.argv[4] || 15;
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
    await connection.syncDeviceTime();

    // log contacts
    const contacts = await connection.getContacts();
    console.log(`Contacts:`, contacts);
    for(const contact of contacts) {
        console.log(`Contact: ${contact.advName}`);
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
        telemetryInterval = setInterval(() => getRepeaterTelemetry(repeaterPublicKeyPrefix), telemetryIntervalMs);
        getRepeaterTelemetry(repeaterPublicKeyPrefix); // Also fetch immediately on connect
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
        console.log(e);
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

async function getRepeaterTelemetry(publicKeyPrefix) {
    console.log("Fetching repeater telemetry...");
    try {
        const contact = await connection.findContactByPublicKeyPrefix(Buffer.from(publicKeyPrefix, "hex"));
        if(!contact){
            console.log("Repeater contact not found");
            return;
        }

        // login to repeater (with empty guest password)
        console.log("Logging in to repeater...");
        const res = await connection.login(contact.publicKey, "");
        console.log("Login response", res);

        // get repeater telemetry
        console.log("Fetching telemetry...");
        const telemetry = await connection.getTelemetry(contact.publicKey);
        console.log("Repeater telemetry", telemetry);

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