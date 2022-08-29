import { app } from "electron";

import "./pkg/ui/system/keyboard";
import driver from "./pkg/ui/driver";
import { setupToggleInteractive } from "./pkg/ui/window";
import config from "./pkg/config";

const DEBUG = process.env.DEBUG ? true : false;

function main() {
	const driverReady = driver.start({ debug: DEBUG }).catch((err) => {
		console.error(`failed starting driver: ${err}`);
		app.quit();
	});

	// Handle creating/removing shortcuts on Windows when installing/uninstalling.
	if (require("electron-squirrel-startup")) {
		// eslint-disable-line global-require
		close();
	}

	// This method will be called when Electron has finished
	// initialization and is ready to create browser windows.
	// Some APIs can only be used after this event occurs.
	app.on("ready", async () => {
		try {
			await driverReady;
		} catch (err) {
			console.error(`Failed starting app: ${err}`);
			app.quit();
		}
	});

	app.on("window-all-closed", async () => {
		close();
	});
}

function close() {
	driver.stop().catch((err) => {
		console.error(err);
		app.quit();
	});
}

main();
