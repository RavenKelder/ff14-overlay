import {
	createMenu,
	setupMenuStateHandler,
	setupProfileSwapEvent,
} from "./window";
import { getResolution, getScreenFactor } from "./system/display";
import { Channel, setupFileResponse, setupStartOK } from "./ipc";
import { forceMenuStateOpen } from "./window/keyevents";
import { multiplyVec2 } from "./maths";
import "./system/sound";
import { Parser } from "../parsingservice/parser";
import {
	setupCooldownEvents,
	setupCustomInCombatEvents,
	setupPlayerStatsEvents,
} from "../parsingservice/parserevents";
import { setupAbilityCharges } from "../parsingservice/ipc";
import { OverlayPlugin } from "../parsingservice/overlayplugin";
import { ProfilesConfig } from "./profiles";
import { closeTray, createTray } from "./window/tray";
import { AbilityManager } from "../parsingservice/parser/ability";
import { app } from "electron";

const DEFAULT_PROFILE_DIR = "assets/profiles";
const DEFAULT_ICON = "assets/tray.png";

let appReady = false;

const overlayPlugin = new OverlayPlugin();
let profilesConfig: ProfilesConfig | null = null;
let parser: Parser | null = null;

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
	menuEscapeRadius?: number;
	menuDiameter?: number;
	iconLength?: number;
	segments?: number;
	debug?: boolean;
	profilesDir?: string;
	iconFile?: string;
}

const defaultStartOptions: Required<StartOptions> = {
	menuEscapeRadius: 150,
	menuDiameter: 400,
	iconLength: 50,
	segments: 12,
	debug: false,
	profilesDir: DEFAULT_PROFILE_DIR,
	iconFile: DEFAULT_ICON,
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

	profilesConfig = new ProfilesConfig(startOptions.profilesDir);
	parser = new Parser(overlayPlugin, new AbilityManager(profilesConfig));

	const configValue = await profilesConfig.getConfig();

	await profilesConfig.setup();

	setupStartOK(startOptions, (event) => {
		console.log("Menu window OK.");
		forceMenuStateOpen(false);
		if (profilesConfig === null) {
			throw new Error("profilesConfig unexpectedly null");
		}
		profilesConfig
			.getCurrentProfile()
			.then((p) => {
				if (profilesConfig === null) {
					throw new Error("profilesConfig is unexpectedly null");
				}
				return profilesConfig.getProfileIcons(p.name);
			})
			.then((bindings) => {
				bindings.forEach((b) => {
					event.reply(Channel.FileReceive, b.iconBase64, b.segment);
				});
			});
		appReady = true;
	});

	setupProfileSwapEvent(profilesConfig);
	setupFileResponse();

	setupAbilityCharges(parser);
	setupCooldownEvents(parser, profilesConfig);
	setupCustomInCombatEvents(parser);
	setupPlayerStatsEvents(parser, profilesConfig);

	await Promise.all([
		setupMenuStateHandler({
			escapeRadius:
				opts.menuEscapeRadius ?? defaultStartOptions.menuEscapeRadius,
			key: configValue.openMenu,
			screenSize: multiplyVec2(screenSize, screenFactor),
			segments: opts.segments ?? defaultStartOptions.segments,
			sendMouseToCentre: configValue.sendMouseToCentre,
			profilesConfig: profilesConfig,
		}),
		parser.start(),
		createMenu({ debug: opts.debug }),
		createTray({
			icon: startOptions.iconFile,
			profilesConfig: profilesConfig,
			close: stop,
		}),
	]);
}

async function stop(): Promise<void> {
	if (parser) {
		await parser.stop();
	}
	overlayPlugin.stop();
	closeTray();
	app.quit();
	return;
}

export default {
	start,
	stop,
};
