import { ipcMain } from "electron";
import { keyboard, Key } from "@nut-tree/nut-js";
import path from "path";
import {
	GlobalKeyboardListener,
	IGlobalKeyListener,
} from "node-global-key-listener";

import config from "../config";

keyboard.config.autoDelayMs = 3;

ipcMain.on("segment-select", (event, index: number) => {
	if (config.bindings[index]) {
		const keys = config.bindings[index].command;

		pressKeys(keys);
	}
});

export async function pressKeys(keys: string[]) {
	const nonNullPresses: Key[] = [];
	keys.map(mapKey).forEach((key) => {
		if (key !== null) {
			nonNullPresses.push(key);
		}
	});

	await keyboard.pressKey(...nonNullPresses);
	await waitRandom(5, 20);

	await keyboard.releaseKey(...nonNullPresses);
}

function waitRandom(min: number, max: number): Promise<void> {
	const waitTime = Math.floor(Math.random() * (max - min));
	return new Promise((res) => {
		setTimeout(() => {
			res();
		}, waitTime);
	});
}

function mapKey(input: string): Key | null {
	switch (input) {
		case "1":
			return Key.Num1;
		case "2":
			return Key.Num2;
		case "3":
			return Key.Num3;
		case "4":
			return Key.Num4;
		case "5":
			return Key.Num5;
		case "6":
			return Key.Num6;
		case "7":
			return Key.Num7;
		case "8":
			return Key.Num8;
		case "9":
			return Key.Num9;
		case "0":
			return Key.Num0;
		case "-":
			return Key.Minus;
		case "=":
			return Key.Equal;
		case "control":
			return Key.LeftControl;
		case "shift":
			return Key.LeftShift;
		case "alt":
			return Key.LeftAlt;
		case "s":
			return Key.S;
		case "[":
			return Key.LeftBracket;
		case "]":
			return Key.RightBracket;
	}

	return null;
}

const listener = new GlobalKeyboardListener({
	windows: {
		serverPath: path.join(
			__dirname,
			"../../node_modules/node-global-key-listener/bin/WinKeyServer.exe",
		),
	},
});

export function addListener(l: IGlobalKeyListener) {
	listener.addListener(l).catch((err) => {
		console.error(`failed to add listener: ${err}`);
	});
}

export function removeListener(l: IGlobalKeyListener) {
	listener.removeListener(l);
}
