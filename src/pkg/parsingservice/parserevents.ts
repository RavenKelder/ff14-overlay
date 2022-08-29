import { getMenuAndRun } from "../ui/window";
import { Channel } from "../ui/ipc";
import { Parser } from "./parser";
import {
	CustomCombatStatus,
	CustomCombatStatusID,
	CustomOnCooldown,
	CustomOnCooldownID,
	CustomPrimaryPlayerEntityStatus,
	CustomPrimaryPlayerEntityStatusID,
	PlayerStats,
	PlayerStatsID,
} from "./parser/events";
import { play } from "../ui/system/sound";
import "./overlayplugin";
import { ProfilesConfig } from "../ui/profiles";

const WARNING_ABILITIES = ["Battle Litany", "Lance Charge", "Nastrond"];

export function setupCooldownEvents(
	parser: Parser,
	profilesConfig: ProfilesConfig,
) {
	const cooldownEventHandler = (event: unknown) => {
		if (!(event instanceof CustomOnCooldown)) {
			return;
		}
		profilesConfig
			.getCurrentProfileBinding({
				ability: event.ability.name,
			})
			.then((binding) => {
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
			w.webContents.send(Channel.Combat, event.inCombat);
		});
	});
}

export function setupPlayerStatsEvents(
	parser: Parser,
	profilesConfig: ProfilesConfig,
) {
	parser.hooks.attach(PlayerStatsID, (event) => {
		if (!(event instanceof PlayerStats)) {
			return;
		}

		(async () => {
			const p = await profilesConfig.getProfileByJobID(event.jobID);
			if (p === null) {
				return;
			}

			const currentP = await profilesConfig.getCurrentProfile();
			if (currentP.name === p.name) {
				return;
			}

			await profilesConfig.setCurrentProfile(p.name);
		})();
	});
}

export function setupCustomPrimaryPlayerEntityStatusEvents(parser: Parser) {
	let latest = new Date(0);
	parser.hooks.attach(CustomPrimaryPlayerEntityStatusID, (e) => {
		if (!(e instanceof CustomPrimaryPlayerEntityStatus)) {
			return;
		}

		if (latest.getTime() >= e.timestamp.getTime()) {
			return;
		}

		latest = e.timestamp;

		getMenuAndRun(async (menu) => {
			menu.webContents.send(Channel.PrimaryPlayerStatus, e.entity);
		});

		console.log(`Player: ${JSON.stringify(e.entity, null, 2)}`);

		console.log(`Current HP: ${e.entity.HP}/${e.entity.maxHP}`);
	});
}
