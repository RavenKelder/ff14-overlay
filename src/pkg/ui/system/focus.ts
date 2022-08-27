import { getActiveWindow } from "@nut-tree/nut-js";
import * as electron from "electron";
import config from "../../config";
import { getMenuAndRun } from "../window";

let timer: NodeJS.Timer | null = null;
let powerSaverID: number | null = null;

// Polls the active window and makes the window show only if FF14 is the focused
// window. Since the menu window goes on top of everything, not doing this causes
// the taskbar to be hidden even when tabbed out of the game. This also stops
// the app from being throttled when FF14 is focused.
export function setupPollActiveWindow() {
	if (process.env.DEBUG) {
		return;
	}

	timer = setInterval(() => {
		getActiveWindow().then((w) => {
			w.title.then((t) => {
				getMenuAndRun(async (menu) => {
					if (menu.isVisible() && !(config.FF14_WINDOW_NAME === t)) {
						if (powerSaverID !== null) {
							electron.powerSaveBlocker.stop(powerSaverID);
							powerSaverID = null;
						}

						menu.hide();
						console.log("Hiding window.");
					} else if (
						!menu.isVisible() &&
						config.FF14_WINDOW_NAME === t
					) {
						powerSaverID = electron.powerSaveBlocker.start(
							"prevent-app-suspension",
						);

						menu.show();
						console.log("Showing window.");
					}
				});
			});
		});
	}, 500);
}

export function stopPollActiveWindow() {
	if (timer !== null) {
		clearInterval(timer);
	}
}
