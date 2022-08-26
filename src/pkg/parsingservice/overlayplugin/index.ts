import WebSocket from "ws";
const OVERLAY_PLUGIN_URL = "ws://localhost:10501/ws";

const client = new WebSocket(OVERLAY_PLUGIN_URL);
let started = false;

const hooks: Record<string, ((message: unknown) => void)[]> = {};

client.on("connectFailed", function (error) {
	console.log("Connect Error: " + error.toString());
});
const clientReady = new Promise<void>((res, rej) => {
	client.on("open", function () {
		console.log("WebSocket Client Connected");
		client.on("error", function (error: Error) {
			console.log("Connection Error: " + error.toString());
			rej(error);
		});
		client.on("close", function () {
			console.log("WebSocket Client Connection Closed");
		});
		client.on("message", function (message: unknown) {
			if (Buffer.isBuffer(message)) {
				const m: { type: string } = JSON.parse(message.toString());
				if (m.type && hooks[m.type] !== undefined) {
					hooks[m.type].forEach((h) => {
						h(m);
					});
				}
			} else {
				console.log(`unexpected typeof message ${typeof message}`);
			}
		});
		res();
	});
});

export function addOverlayPluginHook(
	event: string,
	callback: (message: unknown) => void,
) {
	if (started) {
		console.warn(
			`Warning: OverlayPlugin socket has already started. Some events may have been missed.`,
		);
	}
	if (hooks[event] !== undefined) {
		hooks[event].push(callback);
	} else {
		hooks[event] = [callback];
	}
}

export async function startOverlayPluginEvents(): Promise<void> {
	await clientReady;
	started = true;
	client.send(
		JSON.stringify({
			call: "subscribe",
			events: ["CombatData", "ChangePrimaryPlayer", "LogLine"],
		}),
		(err) => {
			if (err) {
				console.log(`Websocket Client error: ${err}`);
			} else {
				console.log("Started listening to OverlayPlugin");
			}
		},
	);
}

export async function stopOverlayPluginEvents(): Promise<void> {
	await clientReady;
	started = false;
	client.close();
}
