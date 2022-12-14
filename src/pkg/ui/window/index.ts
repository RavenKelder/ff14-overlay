import { Mutex } from "async-mutex";
import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { setupPollActiveWindow, stopPollActiveWindow } from "../system/focus";
import { setupMenuStateHandler, setupToggleInteractive } from "./keyevents";
import { setupProfileSwapEvent } from "./profileevents";

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const GET_MENU_TIMEOUT = 10000;

const mutex = new Mutex();
let runningCommands = 0;

let currentMenu: BrowserWindow | null = null;

export interface CreateMenuOptions {
	height?: number;
	width?: number;
	debug?: boolean;
}

let lastCreateMenuOptions: CreateMenuOptions = {};

export async function createMenu(opts = lastCreateMenuOptions): Promise<void> {
	lastCreateMenuOptions = opts;
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

export async function restartMenu(opts = lastCreateMenuOptions): Promise<void> {
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
			backgroundThrottling: false,
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
		};
	}

	currentMenu = new BrowserWindow(baseBrowserWindowOpts);
	if (debug) {
		currentMenu.webContents.openDevTools({ mode: "detach" });
	}

	currentMenu.setIgnoreMouseEvents(true);

	currentMenu.setAlwaysOnTop(true, "pop-up-menu");

	currentMenu.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
	stopPollActiveWindow();
	setupPollActiveWindow();
	release();
	console.log("Menu restarted.");
}

export { setupToggleInteractive, setupMenuStateHandler, setupProfileSwapEvent };
