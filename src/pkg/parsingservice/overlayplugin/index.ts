import { Hook, HookManager } from "../../ui/hooks";
import WebSocket from "ws";
const OVERLAY_PLUGIN_URL = "ws://localhost:10501/ws";

export class OverlayPlugin {
	url: string;
	client: WebSocket | null = null;
	hooks: HookManager<unknown>;
	closed = false;
	constructor(url = OVERLAY_PLUGIN_URL) {
		this.url = url;
		this.hooks = new HookManager();
	}

	start() {
		const connect = () => {
			this.client = new WebSocket(this.url);
			this.client.on("open", () => {
				console.log("(OverlayPlugin.start) client open");
				if (this.client === null) {
					throw new Error(
						"(OverlayPlugin.start) client unexpectedly null",
					);
				}

				this.client.on("message", (message: unknown) => {
					console.log((message as Buffer).toString());
					if (Buffer.isBuffer(message)) {
						const m: { type: string } = JSON.parse(
							message.toString(),
						);
						if (m.type) {
							this.hooks.run(m.type, m);
						}
					} else {
						console.log(
							`unexpected typeof message ${typeof message}`,
						);
					}
				});

				this.client.send(
					JSON.stringify({
						call: "subscribe",
						events: [
							"CombatData",
							"ChangePrimaryPlayer",
							"LogLine",
						],
					}),
					(err) => {
						if (err) {
							console.log(
								`(OverlayPlugin.start) Failed sending subscribe message: ${err.message}`,
							);
						} else {
							console.log(
								"(OverlayPlugin.start) Started listening to OverlayPlugin",
							);
						}
					},
				);
			});
			this.client.on("error", (err) => {
				console.log(
					"(OverlayPlugin.start) client error:",
					err.toString(),
				);
			});
			this.client.on("close", () => {
				if (this.closed) {
					return;
				}
				console.log(
					"(OverlayPlugin.start) client closing. Retrying...",
				);
				setTimeout(() => {
					connect();
				}, 500);
			});
		};

		connect();
	}

	stop() {
		this.closed = true;
		if (this.client !== null) {
			this.client.close();
		}
	}

	attachHook(event: string, h: Hook<unknown>): string {
		return this.hooks.attach(event, h);
	}

	detachHook(event: string, id: string): boolean {
		return this.hooks.detach(event, id);
	}
}
