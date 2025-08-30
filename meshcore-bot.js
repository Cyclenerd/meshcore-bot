import { Constants, NodeJSSerialConnection } from "@liamcottle/meshcore.js";

// get port from cli arguments
const port = process.argv[2] || "/dev/cu.usbmodem1101";
console.log(`Connecting to ${port}`);

// create connection
const connection = new NodeJSSerialConnection(port);

let reconnectInterval;

// wait until connected
connection.on("connected", async () => {

    // we are now connected
    console.log("Connected");

    // clear reconnect interval if it exists
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }

    // update clock on meshcore device
    await connection.syncDeviceTime();

});

// auto reconnect on disconnect
connection.on("disconnected", () => {
    console.log("Disconnected, trying to reconnect...");
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
    }
    reconnectInterval = setInterval(async () => {
        try {
            await connection.connect();
        } catch (e) {
            // ignore, we will retry
        }
    }, 3000);
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
    console.log("Received contact message", message);
}

async function onChannelMessageReceived(message) {
    console.log(`Received channel message`, message);
    // handle commands only in own channels, not in public channel with id 0
    if(message.channelIdx > 0){
        if(message.text.includes("!ping")){
            await connection.sendChannelTextMessage(message.channelIdx, "PONG! 🏓");
            return;
        }
        if(message.text.includes("!date")){
            await connection.sendChannelTextMessage(message.channelIdx, (new Date()).toISOString());
            return;
        }
    }
}

// connect to meshcore device
try {
    await connection.connect();
} catch (e) {
    console.error("Failed to connect initially", e);
}
