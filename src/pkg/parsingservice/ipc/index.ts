import { ipcMain } from "electron";
import { Channel } from "../../ui/ipc";
import { Parser } from "../parser";

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
