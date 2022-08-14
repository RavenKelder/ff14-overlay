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

export async function createMenu(
	opts: CreateMenuOptions = {},
): Promise<BrowserWindow> {
	const [height, width, debug] = [
		opts.height ?? 600,
		opts.width ?? 800,
		opts.debug ?? false,
	];
	if (currentMenu !== null) {
		throw new Error("cannot create multiple menus");
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

	return currentMenu;
}

export async function getMenu(): Promise<BrowserWindow> {
	if (currentMenu !== null) {
		return currentMenu;
	}

	return new Promise((res) => {
		const timer = setInterval(() => {
			if (currentMenu !== null) {
				clearInterval(timer);
				res(currentMenu);
			}
		}, 300);
	});
}

export {
	setupCooldownEvents,
	setupToggleInteractive,
	setupCombatToggle,
	setupMenuStateHandler,
};
