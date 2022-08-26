import abilityconfig from "./abilities.json";
import keybindingsconfig from "./keybindings.json";

const FF14_WINDOW_NAME = "FINAL FANTASY XIV";
const DEFAULT_ACT_LOG_DIR =
	"AppData\\Roaming\\Advanced Combat Tracker\\FFXIVLogs";
const ASSETS_DIR = "assets";

const bufferLeniency = abilityconfig.bufferLeniency;
const sendMouseToCentre = keybindingsconfig.sendMouseToCentre;

export interface Ability {
	name: string;
	cooldown: number;
	charges: number;
}

export interface Binding {
	segment: number;
	command: string[];
	ability: string;
}

const abilities: Record<string, Ability> = {};
abilityconfig.abilities.forEach((a) => {
	abilities[a.abilityName] = {
		name: a.abilityName,
		cooldown: a.cooldown,
		charges: a.charges ?? 1,
	};
});

const bindings: Record<string, Record<string, Binding>> = {};
const bindingsBySegment: Record<string, Record<number, Binding>> = {};

for (let i = 0; i < Object.keys(keybindingsconfig.profiles).length; i++) {
	const keys = Object.keys(keybindingsconfig.profiles);
	const binding = Object.values(keybindingsconfig.profiles);

	bindings[keys[i]] = {};
	bindingsBySegment[keys[i]] = {};
	binding[i].forEach((b) => {
		bindings[keys[i]][b.ability] = b;
		bindingsBySegment[keys[i]][b.segment] = b;
	});
}

const functionKeyRegex = /F[0-9]{1,2}/g;

let openMenu = keybindingsconfig.openMenu;
if (openMenu.match(functionKeyRegex)) {
	openMenu = `VK_${openMenu}`;
}

const uiBindings = {
	openMenu: openMenu,
	toggleInteractiveUI: keybindingsconfig.toggleInteractiveUI,
	restartUI: keybindingsconfig.restartUI,
	closeUI: keybindingsconfig.closeUI,
	openGameUI: keybindingsconfig.openGameUI,
	closeGameUI: keybindingsconfig.closeGameUI,
};

export default {
	FF14_WINDOW_NAME,
	DEFAULT_ACT_LOG_DIR,
	ASSETS_DIR,
	abilities,
	bindings,
	bufferLeniency,
	uiBindings,
	sendMouseToCentre,
};
