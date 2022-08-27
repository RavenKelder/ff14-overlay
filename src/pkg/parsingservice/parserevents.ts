import { getMenuAndRun, restartMenu } from "../ui/window";
import { Channel } from "../ui/ipc";
import { Parser } from "./parser";
import {
	CustomCombatStatus,
	CustomCombatStatusID,
	CustomOnCooldown,
	CustomOnCooldownID,
	PlayerStats,
	PlayerStatsID,
} from "./parser/events";
import { play } from "../ui/system/sound";
import "./overlayplugin";
import {
	getCurrentProfile,
	getCurrentProfileBinding,
	getProfile,
	getProfileByJobID,
	getProfileIcons,
	setCurrentProfile,
} from "../ui/profiles";

const WARNING_ABILITIES = ["Battle Litany", "Lance Charge", "Nastrond"];

export function setupCooldownEvents(parser: Parser) {
	const cooldownEventHandler = (event: unknown) => {
		if (!(event instanceof CustomOnCooldown)) {
			return;
		}
		getCurrentProfileBinding({
			ability: event.ability.name,
		}).then((binding) => {
			if (binding === null) {
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
					binding.segment,
					event.ability,
				);
			});
		});
	};
	parser.hooks.attach(CustomOnCooldownID, cooldownEventHandler);
}

export function setupCustomInCombatEvents(parser: Parser) {
	parser.hooks.attach(CustomCombatStatusID, (event) => {
		if (!(event instanceof CustomCombatStatus)) {
			return;
		}
		getMenuAndRun(async (w) => {
			w.webContents.send(
				Channel.Combat,
				event.status.isActive &&
					Object.keys(event.status.combatant).includes("YOU"),
			);
		});
	});
}

export function setupPlayerStatsEvents(parser: Parser) {
	parser.hooks.attach(PlayerStatsID, (event) => {
		if (!(event instanceof PlayerStats)) {
			return;
		}

		getProfileByJobID(event.jobID).then((p) => {
			if (p === null) {
				return;
			}

			getCurrentProfile().then((currentP) => {
				if (currentP.name === p.name) {
					return;
				}

				setCurrentProfile(p.name).then(() => {
					getProfile(p.name)
						.then(getProfileIcons)
						.then((bindings) => {
							restartMenu().then(() => {
								getMenuAndRun(async (menu) => {
									bindings.forEach((b) => {
										menu.webContents.send(
											Channel.FileReceive,
											b.iconBase64,
											b.segment,
										);
									});
								});
							});
						});
				});
			});
		});
	});
}
