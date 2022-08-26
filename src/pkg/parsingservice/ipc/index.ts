import { ipcMain } from "electron";
import { getMenuAndRun } from "../../ui/window";
import { Channel } from "../../ui/ipc";
import { pressKeys } from "../../ui/system/keyboard";
import { Parser } from "../parser";
import { CustomInCombatID, CustomOutOfCombatID } from "../parser/events";

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
		parser.getAbilityBySegment(segment).then((ability) => {
			event.reply(Channel.AbilityChargesReceive, segment, ability);
		});
	});
}
