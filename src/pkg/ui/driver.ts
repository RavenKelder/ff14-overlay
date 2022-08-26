import { setupMenuStateHandler } from "./window";
import { getResolution, getScreenFactor } from "./system/display";
import { Channel, setupFileResponse, setupStartOK } from "./ipc";
import { forceMenuStateOpen } from "./window/keyevents";
import { multiplyVec2 } from "./maths";
import "./system/sound";
import { setupPollActiveWindow } from "./system/focus";
import { Parser } from "../parsingservice/parser";
import config from "../config";
import {
	setupCooldownEvents,
	setupCustomInCombatEvents,
} from "../parsingservice/parserevents";
import { setupAbilityCharges } from "../parsingservice/ipc";
import {
	startOverlayPluginEvents,
	stopOverlayPluginEvents,
} from "../parsingservice/overlayplugin";
import { getCurrentProfile, getProfileIcons } from "./profiles";

const DEFAULT_PROFILE = 0;

let appReady = false;

export const parser = new Parser();

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
	profile?: number;
}

const defaultStartOptions: Required<StartOptions> = {
	menuOpenKey: "VK_F10",
	menuEscapeRadius: 150,
	menuDiameter: 400,
	iconLength: 50,
	segments: 12,
	debug: false,
	profile: DEFAULT_PROFILE,
};

async function start(opts: StartOptions = defaultStartOptions): Promise<void> {
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
		getCurrentProfile()
			.then(getProfileIcons)
			.then((bindings) => {
				bindings.forEach((b) => {
					event.reply(Channel.FileReceive, b.iconBase64, b.segment);
				});
			});
		appReady = true;
	});

	setupFileResponse();

	setupPollActiveWindow();

	setupAbilityCharges(parser);

	await parser.start();

	setupCooldownEvents(parser);
	setupCustomInCombatEvents(parser);

	await Promise.all([
		setupMenuStateHandler({
			escapeRadius:
				opts.menuEscapeRadius ?? defaultStartOptions.menuEscapeRadius,
			key: opts.menuOpenKey,
			screenSize: multiplyVec2(screenSize, screenFactor),
			segments: opts.segments ?? defaultStartOptions.segments,
			sendMouseToCentre: config.sendMouseToCentre,
		}),
		startOverlayPluginEvents(),
	]);
}

function stop(): Promise<void> {
	parser.stop();
	return stopOverlayPluginEvents();
}

export default {
	start,
	stop,
};