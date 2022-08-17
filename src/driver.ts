import { Parser, ParserOptions } from "./pkg/parser";
import { setupCooldownEvents, setupMenuStateHandler } from "./pkg/window";
import abilityconfig from "./pkg/config/";
import { getResolution, getScreenFactor } from "./pkg/system/display";
import {
	Channel,
	setupAbilityCharges,
	setupFileResponse,
	setupStartOK,
} from "./pkg/ipc";
import { getExistingFiles } from "./pkg/file";
import { forceMenuStateOpen } from "./pkg/window/keyevents";
import { multiplyVec2 } from "./pkg/maths";
import { setupCombatTrigger } from "./pkg/window/parserevents";
import "./pkg/system/sound";

const parserOpts: ParserOptions = {
	defaultPrimaryPlayer: "Raven Kelder",
	abilities: Object.values(abilityconfig.abilities),
	bindings: Object.values(abilityconfig.bindings),
};

if (parserOpts.defaultPrimaryPlayer !== "") {
	console.log(
		`Using default primary player: ${parserOpts.defaultPrimaryPlayer}`,
	);
}

const parser = new Parser(parserOpts);

function setupParseLog() {
	parser.hooks.attachGlobal((e) => {
		const out = e.string();
		console.log(`[${e.ID}|${e.timestamp.toISOString()}] ${out}`);
	});
}

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
	menuEscapeRadius: 200,
	menuDiameter: 400,
	iconLength: 50,
	segments: 12,
	debug: false,
};

async function start(opts: StartOptions = defaultStartOptions): Promise<void> {
	if (opts.debug) {
		setupParseLog();
	}
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
		parser.setInCombat(false);
		getExistingFiles().then((icons) => {
			icons.forEach((icon) => {
				event.reply(Channel.FileReceive, icon.base64, icon.index);
			});
		});
		appReady = true;
	});

	setupFileResponse();

	setupAbilityCharges(parser);
	setupCooldownEvents(parser, segmentBinding);
	setupCombatTrigger(parser);

	await Promise.all([
		setupMenuStateHandler({
			escapeRadius:
				opts.menuEscapeRadius ?? defaultStartOptions.menuEscapeRadius,
			key: opts.menuOpenKey,
			screenSize: multiplyVec2(screenSize, screenFactor),
			segments: opts.segments ?? defaultStartOptions.segments,
			binding: commandBinding,
		}),
		parser.start(),
	]);
}

function stop(): Promise<void> {
	parser.stop();
	return new Promise((res) => res());
}

export default {
	start,
	stop,
};
