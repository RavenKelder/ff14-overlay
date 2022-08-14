import { getMenu } from ".";
import { Channel } from "../ipc";
import { Parser } from "../parser";
import {
	CustomInCombatID,
	CustomOnCooldown,
	CustomOnCooldownID,
	CustomOutOfCombatID,
} from "../parser/events";
import { pressKeys } from "../system/keyboard";

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

		getMenu().then((w) => {
			w.webContents.send(
				Channel.SegmentCooldown,
				binding[event.ability.name],
				event.ability.cooldown,
			);
		});
	});
}

export async function setupCombatTrigger(parser: Parser) {
	const window = await getMenu();
	parser.hooks.attach(CustomOutOfCombatID, () => {
		pressKeys(["shift", "]"]);
		window.webContents.send(Channel.Combat, false);
	});
	parser.hooks.attach(CustomInCombatID, () => {
		pressKeys(["shift", "["]);
		window.webContents.send(Channel.Combat, true);
	});
}
