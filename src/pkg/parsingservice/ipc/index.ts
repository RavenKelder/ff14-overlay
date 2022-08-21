import { Parser } from "../parser";
import { CustomInCombatID } from "../parser/events";

export function setupAbilityCharges(parser: Parser) {
	ipcMain.on(Channel.AbilityChargesRequest, (event, segment) => {
		if (typeof segment !== "number") {
			console.error(
				`unexpected typeof segment ${typeof segment}: ${JSON.stringify(
					segment,
				)}`,
			);
			return;
		}
		const ability = parser.getAbilityBySegment(segment);
		event.reply(Channel.AbilityChargesReceive, segment, ability);
	});
}

export async function setupCombatToggle(
	parser: Parser,
	inCombatCommand: string[],
	outOfCombatCommand: string[],
) {
	parser.hooks.attach(CustomInCombatID, () => {
		pressKeys(inCombatCommand);
	});

	parser.hooks.attach(CustomOutOfCombatID, () => {
		pressKeys(outOfCombatCommand);
	});
}
