import abilityconfig from "./abilities.json";
import keybindingsconfig from "./keybindings.json";

const FF14_WINDOW_NAME = "FINAL FANTASY XIV";
const ASSETS_DIR = "assets";

const sendMouseToCentre = keybindingsconfig.sendMouseToCentre;

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
	ASSETS_DIR,
	abilities,
	uiBindings,
	sendMouseToCentre,
};
