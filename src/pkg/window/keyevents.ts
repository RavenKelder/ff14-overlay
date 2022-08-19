import { mouse, Point } from "@nut-tree/nut-js";
import { globalShortcut } from "electron";
import { IGlobalKeyEvent } from "node-global-key-listener";
import { getMenuAndRun } from ".";
import { addListener, pressKeys, removeListener } from "../system/keyboard";
import { sendMouseTo } from "../system/mouse";
import { Channel } from "../ipc";
import { Vec2 } from "../maths";
import { Parser } from "../parser";
import { CustomInCombatID, CustomOutOfCombatID } from "../parser/events";
import { runAndSetInterval } from "../util";
import { Mutex } from "async-mutex";

export async function setupToggleInteractive(
	key: string,
	startInteractive = false,
): Promise<boolean> {
	let mouseEventIgnored = !startInteractive;

	return globalShortcut.register(key, () => {
		getMenuAndRun(async (menu) => {
			mouseEventIgnored = !mouseEventIgnored;
			if (mouseEventIgnored) {
				menu.setIgnoreMouseEvents(true);
				menu.setAlwaysOnTop(true);
				menu.setFocusable(false);
			} else {
				menu.setIgnoreMouseEvents(false);
				menu.setAlwaysOnTop(false);
				menu.setFocusable(true);
			}
		});
	});
}

export async function setupCombatToggle(
	parser: Parser,
	inCombatCommand: string[],
	outOfCombatCommand: string[],
) {
	parser.hooks.attach(CustomInCombatID, () => {
		pressKeys(inCombatCommand);
	});

	parser.hooks.attach(CustomOutOfCombatID, () => {
		pressKeys(outOfCombatCommand);
	});
}

interface SetupMenuStateHandlerOptions {
	key: string;
	escapeRadius: number;
	segments: number;
	screenSize: Vec2;
	binding: Record<number, string[]>;
}
interface MenuState {
	open: boolean;
}

const menuState: MenuState = {
	open: false,
};

function getMenuState(): MenuState {
	return menuState;
}

export function forceMenuStateOpen(open: boolean) {
	menuState.open = open;
}

let menuStateHandler: (event: IGlobalKeyEvent) => void;

export async function setupMenuStateHandler(
	opts: SetupMenuStateHandlerOptions,
) {
	if (menuStateHandler) {
		removeListener(menuStateHandler);
	}

	const centre: Vec2 = {
		x: opts.screenSize.x / 2,
		y: opts.screenSize.y / 2,
	};

	const menuStateMutex = new Mutex();
	let lastOpenEvent = new Date();
	let lastCloseEvent = new Date();

	menuStateHandler = (event) => {
		if (event.rawKey._nameRaw !== opts.key) {
			return;
		}

		if (menuState.open && event.state === "UP") {
			lastCloseEvent = new Date();
			menuStateMutex.runExclusive(() => {
				if (lastCloseEvent.getTime() < lastOpenEvent.getTime()) {
					return;
				}
				if (!menuState.open) {
					return;
				}
				menuState.open = false;
				return getMenuAndRun(async (w) => {
					return getMenuSelection(
						centre,
						opts.escapeRadius,
						opts.segments,
					).then((selected) => {
						w.webContents.send(Channel.MenuClose, selected);

						if (selected === null) {
							return;
						}
						pressKeys(opts.binding[selected]);
						w.webContents.send(Channel.SegmentHover, -1);
					});
				});
			});
		} else if (!menuState.open && event.state === "DOWN") {
			lastOpenEvent = new Date();
			menuStateMutex.runExclusive(() => {
				if (lastOpenEvent.getTime() < lastCloseEvent.getTime()) {
					return;
				}
				if (menuState.open) {
					return;
				}
				runAndSetInterval((num) => {
					return getMenuAndRun(async (w) => {
						if (
							lastOpenEvent.getTime() < lastCloseEvent.getTime()
						) {
							return false;
						}
						if (num === 0) {
							menuState.open = true;
							sendMouseTo(centre);
						}

						w.webContents.send(Channel.MenuOpen);

						const result = await getMenuSelection(
							centre,
							opts.escapeRadius,
							opts.segments,
						);

						w.webContents.send(Channel.SegmentHover, result ?? -1);

						return getMenuState().open;
					});
				}, 1);
			});
		}
	};

	addListener(menuStateHandler);
}

async function getMenuSelection(
	centre: Vec2,
	escapeRadius: number,
	segments: number,
): Promise<number | null> {
	const segmentAngle = (2 * Math.PI) / segments;
	const centrePoint = new Point(centre.x, centre.y);

	const position = await mouse.getPosition();

	const [x, y] = [position.x - centrePoint.x, position.y - centrePoint.y];

	if (Math.sqrt(x * x + y * y) < escapeRadius) {
		return null;
	}

	let angle = Math.atan(y / x);

	if (x < 0 && y > 0) {
		angle = angle + Math.PI;
	} else if (x < 0 && y < 0) {
		angle += Math.PI;
	} else if (x > 0 && y < 0) {
		angle = 2 * Math.PI + angle;
	}

	return Math.floor(angle / segmentAngle);
}
