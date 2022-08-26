import { app, BrowserWindow } from "electron";

import "./pkg/ui/system/keyboard";
import driver from "./pkg/ui/driver";
import { createMenu, setupToggleInteractive } from "./pkg/ui/window";
import config from "./pkg/config";
import { createTray } from "./tray";
import { profileReady } from "./pkg/ui/profiles";

const DEBUG = process.env.DEBUG ? true : false;

function main() {
	const driverReady = driver
		.start({
			menuOpenKey: config.uiBindings.openMenu,
			debug: DEBUG,
		})
		.catch((err) => {
			console.error(`failed starting driver: ${err}`);
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
			await profileReady;
			await driverReady;
			await createMenu({ debug: DEBUG });
			await createTray({ icon: "assets/tray.png" });
			const ok = await setupToggleInteractive(
				config.uiBindings.toggleInteractiveUI,
				DEBUG,
			);
			if (!ok) {
				console.error(`Toggle interactive setup failed.`);
			}
		} catch (err) {
			console.error(`Failed starting app: ${err}`);
			app.quit();
		}
	});

	// Quit when all windows are closed, except on macOS. There, it's common
	// for applications and their menu bar to stay active until the user quits
	// explicitly with Cmd + Q.
	app.on("window-all-closed", async () => {
		if (process.platform !== "darwin") {
			close();
		}
	});

	app.on("activate", () => {
		// On OS X it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) {
			createMenu({ debug: DEBUG });
		}
	});
}

main();
