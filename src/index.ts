import { app, BrowserWindow, globalShortcut } from "electron";

import "./pkg/system/keyboard";
import driver from "./driver";
import { createMenu, restartMenu, setupToggleInteractive } from "./pkg/window";

const MENU_OPEN_KEY = "VK_F10";
const TOGGLE_INTERACTIVE_KEY = "F5";
const CLOSE_KEY = "F6";
const RESTART_KEY = "F8";
const DEBUG = process.env.DEBUG ? true : false;

function main() {
	driver
		.start({
			menuOpenKey: MENU_OPEN_KEY,
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
				setupToggleInteractive(TOGGLE_INTERACTIVE_KEY, DEBUG).then(
					(ok) => {
						if (!ok) {
							console.error(`Toggle interactive setup failed.`);
						}
					},
				);

				let ret = globalShortcut.register(CLOSE_KEY, () => {
					close();
				});

				if (!ret) {
					console.log("Close key setup failed.");
				}

				ret = globalShortcut.register(RESTART_KEY, () => {
					restartMenu();
				});

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
