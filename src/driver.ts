import { Parser, ParserOptions } from "./pkg/parser";
import { setupCooldownEvents, setupMenuStateHandler } from "./pkg/window";
import abilityconfig from "./pkg/config/";
import { getResolution, getScreenFactor } from "./pkg/system/display";
import { Channel, setupFileResponse, setupStartOK } from "./pkg/ipc";
import { getExistingFiles } from "./pkg/file";
import { forceMenuStateOpen } from "./pkg/window/keyevents";
import { multiplyVec2 } from "./pkg/maths";
import { setupCombatTrigger } from "./pkg/window/parserevents";

const config: ParserOptions = {
	defaultPrimaryPlayer: "Raven Kelder",
};

if (config.defaultPrimaryPlayer !== "") {
	console.log(`Using default primary player: ${config.defaultPrimaryPlayer}`);
}

const parser = new Parser(config);

parser.hooks.attachGlobal((e) => {
	let out = e.string();
	if (out.length > 100) {
		out = out.slice(0, 100) + "...";
	}
	console.log(`[${e.ID}|${e.timestamp.toISOString()}] ${out}`);
});

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
	segments?: number;
	debug?: boolean;
}

const defaultStartOptions: Required<StartOptions> = {
	menuOpenKey: "VK_F10",
	menuEscapeRadius: 200,
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
		debug: opts.debug ?? false,
		screenWidth: screenSize.x,
		screenHeight: screenSize.y,
	};

	setupStartOK(startOptions, (event) => {
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
