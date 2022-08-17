import { getMenuAndRun } from ".";
import { Channel } from "../ipc";
import { Parser } from "../parser";
import {
	CustomInCombatID,
	CustomOnCooldown,
	CustomOnCooldownID,
	CustomOutOfCombatID,
} from "../parser/events";
import { pressKeys } from "../system/keyboard";
import { play } from "../system/sound";

const WARNING_ABILITIES = ["Battle Litany", "Lance Charge", "Nastrond"];

export function setupCooldownEvents(
	parser: Parser,
	binding: Record<string, number>,
) {
	parser.hooks.attach(CustomOnCooldownID, (event) => {
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
	parser.hooks.attach(CustomOutOfCombatID, () => {
		getMenuAndRun(async (menu) => {
			play("ooc");
			pressKeys(["shift", "]"]);
			menu.webContents.send(Channel.Combat, false);
		});
	});
	parser.hooks.attach(CustomInCombatID, () => {
		getMenuAndRun(async (menu) => {
			play("itc");
			pressKeys(["shift", "["]);
			menu.webContents.send(Channel.Combat, true);
		});
	});
}
