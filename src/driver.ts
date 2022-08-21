import { setupMenuStateHandler } from "./pkg/window";
import abilityconfig from "./pkg/config/";
import { getResolution, getScreenFactor } from "./pkg/system/display";
import { Channel, setupFileResponse, setupStartOK } from "./pkg/ipc";
import { getExistingFiles } from "./pkg/file";
import { forceMenuStateOpen } from "./pkg/window/keyevents";
import { multiplyVec2 } from "./pkg/maths";
import "./pkg/system/sound";
import { setupPollActiveWindow } from "./pkg/system/focus";

let appReady = false;

export async function appWhenReady(): Promise<void> {
	return new Promise((res) => {
		const timer = setInterval(() => {
			if (appReady) {
				clearInterval(timer);
				res();
			}
		}, 200);
	});
}

interface StartOptions {
	menuOpenKey: string;
	menuEscapeRadius?: number;
	menuDiameter?: number;
	iconLength?: number;
	segments?: number;
	debug?: boolean;
}

const defaultStartOptions: Required<StartOptions> = {
	menuOpenKey: "VK_F10",
	menuEscapeRadius: 150,
	menuDiameter: 400,
	iconLength: 50,
	segments: 12,
	debug: false,
};

async function start(opts: StartOptions = defaultStartOptions): Promise<void> {
	const commandBinding: Record<number, string[]> = {};
	for (const b in abilityconfig.bindings) {
		commandBinding[abilityconfig.bindings[b].segment] =
			abilityconfig.bindings[b].command;
	}
	const segmentBinding: Record<string, number> = {};
	for (const b in abilityconfig.bindings) {
		segmentBinding[b] = abilityconfig.bindings[b].segment;
	}

	const screenSize = await getResolution();
	const screenFactor = await getScreenFactor();

	const startOptions = {
		...defaultStartOptions,
		...opts,
		screenWidth: screenSize.x,
		screenHeight: screenSize.y,
	};

	setupStartOK(startOptions, (event) => {
		console.log("Menu window OK.");
		forceMenuStateOpen(false);
		getExistingFiles().then((icons) => {
			icons.forEach((icon) => {
				event.reply(Channel.FileReceive, icon.base64, icon.index);
			});
		});
		appReady = true;
	});

	setupFileResponse();

	setupPollActiveWindow();

	await Promise.all([
		setupMenuStateHandler({
			escapeRadius:
				opts.menuEscapeRadius ?? defaultStartOptions.menuEscapeRadius,
			key: opts.menuOpenKey,
			screenSize: multiplyVec2(screenSize, screenFactor),
			segments: opts.segments ?? defaultStartOptions.segments,
			binding: commandBinding,
			sendMouseToCentre: abilityconfig.sendMouseToCentre,
		}),
	]);
}

function stop(): Promise<void> {
	return new Promise((res) => res());
}

export default {
	start,
	stop,
};
