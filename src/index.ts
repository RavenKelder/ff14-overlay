import { app, BrowserWindow, globalShortcut } from "electron";

import "./pkg/ui/system/keyboard";
import driver from "./pkg/ui/driver";
import {
	createMenu,
	restartMenu,
	setupToggleInteractive,
} from "./pkg/ui/window";
import config from "./pkg/config";

const DEBUG = process.env.DEBUG ? true : false;

function main() {
	driver
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
	app.on("ready", () => {
		createMenu({ debug: DEBUG })
			.then(() => {
				setupToggleInteractive(
					config.uiBindings.toggleInteractiveUI,
					DEBUG,
				).then((ok) => {
					if (!ok) {
						console.error(`Toggle interactive setup failed.`);
					}
				});

				let ret = globalShortcut.register(
					config.uiBindings.closeUI,
					() => {
						close();
					},
				);

				if (!ret) {
					console.log("Close key setup failed.");
				}

				ret = globalShortcut.register(
					config.uiBindings.restartUI,
					() => {
						restartMenu();
					},
				);

				if (!ret) {
					console.log("Restart key setup failed.");
				}
			})
			.catch((err) => {
				console.error(`Failed to start app: ${err}`);
				close();
			});
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

function close() {
	driver
		.stop()
		.catch((err) => {
			console.error(err);
		})
		.finally(() => {
			app.quit();
		});
}

main();
