import abilityconfig from "./abilities.json";

const FF14_WINDOW_NAME = "FINAL FANTASY XIV";
const ASSETS_DIR = "assets";

export interface Ability {
	name: string;
	cooldown: number;
	charges: number;
}

const abilities: Record<string, Ability> = {};
abilityconfig.abilities.forEach((a) => {
	abilities[a.abilityName] = {
		name: a.abilityName,
		cooldown: a.cooldown,
		charges: a.charges ?? 1,
	};
});

export default {
	FF14_WINDOW_NAME,
	ASSETS_DIR,
	abilities,
};
