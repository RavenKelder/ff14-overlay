import { mouse, Point } from "@nut-tree/nut-js";
import { globalShortcut } from "electron";
import { getMenuAndRun, mustGetMenu } from ".";
import { pressKeys, setupListener } from "../system/keyboard";
import { Channel } from "../ipc";
import { Vec2 } from "../maths";
import { Parser } from "../parser";
import { CustomInCombatID, CustomOutOfCombatID } from "../parser/events";
import { sendMouseTo } from "../system/mouse";

const MENU_EVENT_POLL_RATE = 50;

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
	sendMouseToCentre: boolean;
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

export function forceMenuStateOpen(open: boolean) {
	menuState.open = open;
}

let currentMenuStateHandlerTimer: NodeJS.Timer;

export async function setupMenuStateHandler(
	opts: SetupMenuStateHandlerOptions,
) {
	if (currentMenuStateHandlerTimer) {
		clearInterval(currentMenuStateHandlerTimer);
	}

	const centre: Vec2 = {
		x: opts.screenSize.x / 2,
		y: opts.screenSize.y / 2,
	};

	setupListener(
		121,
		(event) => {
			const menu = mustGetMenu();
			if (menu === null) {
				return;
			}
			if (event >= 0) {
				if (menuState.open) {
					getMenuSelection(
						centre,
						opts.escapeRadius,
						opts.segments,
					).then((result) => {
						menu.webContents.send(Channel.MenuClose, result ?? -1);
						if (result !== null) {
							pressKeys(opts.binding[result]);
						}
					});
				}
				menuState.open = false;
			} else {
				if (!menuState.open) {
					if (opts.sendMouseToCentre) {
						sendMouseTo(centre);
					}
					menu.webContents.send(Channel.MenuOpen);
				}
				menuState.open = true;
				getMenuSelection(centre, opts.escapeRadius, opts.segments).then(
					(result) => {
						menu.webContents.send(
							Channel.SegmentHover,
							result ?? -1,
						);
					},
				);
			}
		},
		MENU_EVENT_POLL_RATE,
	);
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
