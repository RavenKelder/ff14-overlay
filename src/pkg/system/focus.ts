import { getActiveWindow } from "@nut-tree/nut-js";
import config from "../config";
import { getMenuAndRun } from "../window";

let timer: NodeJS.Timer | null = null;

let hidden = false;

// Polls the active window and makes the window show only if FF14 is the focused
// window. Since the menu window goes on top of everything, not doing this causes
// the taskbar to be hidden even when tabbed out of the game.
export function setupPollActiveWindow() {
	if (process.env.DEBUG) {
		return;
	}
	timer = setInterval(() => {
		getActiveWindow().then((w) => {
			w.title.then((t) => {
				if (!hidden && !config.FF14_WINDOW_NAME.includes(t)) {
					hidden = true;
					getMenuAndRun(async (w) => {
						w.hide();
					});
				} else if (hidden && config.FF14_WINDOW_NAME.includes(t)) {
					hidden = false;
					getMenuAndRun(async (w) => {
						w.show();
					});
				}
			});
		});
	}, 500);
}

export function stopPollActiveWindow() {
	if (timer !== null) {
		clearInterval(timer);
	}
}
