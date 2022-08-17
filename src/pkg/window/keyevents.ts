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

	menuStateHandler = (event) => {
		if (event.rawKey._nameRaw !== opts.key) {
			return;
		}

		if (menuState.open && event.state === "UP") {
			menuState.open = false;
			getMenuAndRun(async (w) => {
				w.webContents.send(Channel.MenuClose);

				return getMenuSelection(
					centre,
					opts.escapeRadius,
					opts.segments,
				).then((selected) => {
					if (selected === null) {
						return;
					}

					pressKeys(opts.binding[selected]);
					w.webContents.send(Channel.SegmentHover, -1);
				});
			});
		} else if (!menuState.open && event.state === "DOWN") {
			menuState.open = true;

			getMenuAndRun(async (w) => {
				w.webContents.send(Channel.MenuOpen);
			});
			sendMouseTo(centre);

			getMenuAndRun(async (w) => {
				return new Promise((res) => {
					getMenuSelection(
						centre,
						opts.escapeRadius,
						opts.segments,
					).then((hovered) => {
						if (hovered !== null) {
							w.webContents.send(Channel.SegmentHover, hovered);
						} else {
							w.webContents.send(Channel.SegmentHover, -1);
						}

						const timer = setInterval(() => {
							if (!menuState.open) {
								clearInterval(timer);
								res();
								return;
							}

							getMenuSelection(
								centre,
								opts.escapeRadius,
								opts.segments,
							).then((hovered) => {
								if (hovered !== null) {
									w.webContents.send(
										Channel.SegmentHover,
										hovered,
									);
								} else {
									w.webContents.send(
										Channel.SegmentHover,
										-1,
									);
								}
							});
						}, 50);
					});
				});
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
