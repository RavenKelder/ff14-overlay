import { getMenuAndRun } from "../ui/window";
import config from "../config";
import { Channel } from "../ui/ipc";
import { Parser } from "./parser";
import {
	CustomInCombatID,
	CustomOnCooldown,
	CustomOnCooldownID,
	CustomOutOfCombatID,
} from "./parser/events";
import { pressKeys } from "../ui/system/keyboard";
import { play } from "../ui/system/sound";

const WARNING_ABILITIES = ["Battle Litany", "Lance Charge", "Nastrond"];

export function setupCooldownEvents(
	parser: Parser,
	binding: Record<string, number>,
) {
	parser.hooks.attach(CustomOnCooldownID, (event: unknown) => {
		if (!(event instanceof CustomOnCooldown)) {
			return;
		}
		if (
			!Object.prototype.hasOwnProperty.call(binding, event.ability.name)
		) {
			return;
		}
		if (WARNING_ABILITIES.includes(event.ability.name)) {
			setTimeout(() => {
				play("warn");
			}, event.ability.cooldown * 1000);
		}

		getMenuAndRun(async (w) => {
			w.webContents.send(
				Channel.SegmentCooldown,
				binding[event.ability.name],
				event.ability,
			);
		});
	});
}

export async function setupCombatTrigger(parser: Parser) {
	// If open/close UI aren't bound, don't trigger the key events.
	let triggerKeyEvents = true;
	if (
		config.uiBindings.openGameUI.length === 0 ||
		config.uiBindings.closeGameUI.length === 0
	) {
		triggerKeyEvents = false;
	}
	parser.hooks.attach(CustomOutOfCombatID, () => {
		getMenuAndRun(async (menu) => {
			play("ooc");
			menu.webContents.send(Channel.Combat, false);
			if (triggerKeyEvents) {
				pressKeys(config.uiBindings.closeGameUI);
			}
		});
	});
	parser.hooks.attach(CustomInCombatID, () => {
		getMenuAndRun(async (menu) => {
			play("itc");
			menu.webContents.send(Channel.Combat, true);
			if (triggerKeyEvents) {
				pressKeys(config.uiBindings.openGameUI);
			}
		});
	});
}
