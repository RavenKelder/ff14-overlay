import abilityconfig from "./abilities.json";
import keybindingsconfig from "./keybindings.json";

const DEFAULT_ACT_LOG_DIR =
	"AppData\\Roaming\\Advanced Combat Tracker\\FFXIVLogs";
const ASSETS_DIR = "assets";

const bufferLeniency = abilityconfig.bufferLeniency;

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

const bindings: Record<string, Binding> = {};
keybindingsconfig.forEach((b) => {
	bindings[b.ability] = {
		ability: b.ability,
		command: b.command,
		segment: b.segment,
	};
});

export default {
	DEFAULT_ACT_LOG_DIR,
	ASSETS_DIR,
	abilities,
	bindings,
	bufferLeniency,
};
