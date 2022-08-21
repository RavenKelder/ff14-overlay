import { Mutex } from "async-mutex";
import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import {
	setupCombatToggle,
	setupMenuStateHandler,
	setupToggleInteractive,
} from "./keyevents";
import { setupCooldownEvents } from "./parserevents";

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const GET_MENU_TIMEOUT = 10000;

const mutex = new Mutex();
let runningCommands = 0;

const debugOptionsOverride: BrowserWindowConstructorOptions = {
	alwaysOnTop: false,
	transparent: false,
	focusable: true,
	center: true,
};

let currentMenu: BrowserWindow | null = null;

export interface CreateMenuOptions {
	height?: number;
	width?: number;
	debug?: boolean;
}

export async function createMenu(opts: CreateMenuOptions = {}): Promise<void> {
	await mutex.waitForUnlock();
	const release = await mutex.acquire();
	if (currentMenu !== null) {
		release();
		throw new Error("cannot create multiple menus");
	}

	release();
	await restartMenu(opts);
}

export function mustGetMenu(): BrowserWindow | null {
	return currentMenu;
}

export async function getMenuAndRun<T>(
	command: (menu: BrowserWindow) => Promise<T>,
): Promise<T> {
	await mutex.waitForUnlock();
	if (currentMenu !== null) {
		runningCommands += 1;
		return command(currentMenu).finally(() => {
			runningCommands -= 1;
		});
	}

	const start = new Date();

	return new Promise((res, rej) => {
		const timer = setInterval(() => {
			if (new Date().getTime() - start.getTime() > GET_MENU_TIMEOUT) {
				rej("timed out getting menu");
				return;
			}
			if (currentMenu !== null) {
				clearInterval(timer);
				runningCommands += 1;
				command(currentMenu)
					.then((v) => {
						res(v);
					})
					.finally(() => {
						runningCommands -= 1;
					});
			}
		}, 300);
	});
}

export async function restartMenu(opts: CreateMenuOptions = {}): Promise<void> {
	await new Promise<void>((res) => {
		const timer = setInterval(() => {
			if (runningCommands === 0) {
				clearInterval(timer);
				res();
			}
		}, 500);
	});
	await mutex.waitForUnlock();
	const release = await mutex.acquire();
	console.log("Restarting menu...");
	const [height, width, debug] = [
		opts.height ?? 600,
		opts.width ?? 800,
		opts.debug ?? false,
	];
	if (currentMenu !== null) {
		currentMenu.close();
	}

	let baseBrowserWindowOpts: BrowserWindowConstructorOptions = {
		height: height,
		width: width,
		webPreferences: {
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
		},
		alwaysOnTop: true,
		transparent: true,
		frame: false,
		focusable: false,
		center: true,
		fullscreen: true,
	};

	if (debug) {
		baseBrowserWindowOpts = {
			...baseBrowserWindowOpts,
			...debugOptionsOverride,
		};
	}

	currentMenu = new BrowserWindow(baseBrowserWindowOpts);
	if (debug) {
		currentMenu.webContents.openDevTools();
	} else {
		currentMenu.setIgnoreMouseEvents(true);
	}

	currentMenu.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
	release();
	console.log("Menu restarted.");
}

export {
	setupCooldownEvents,
	setupToggleInteractive,
	setupCombatToggle,
	setupMenuStateHandler,
};
