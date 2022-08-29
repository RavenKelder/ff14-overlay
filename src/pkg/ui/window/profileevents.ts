import { restartMenu, getMenuAndRun } from ".";
import { Channel } from "../ipc";
import { ProfileEvent, ProfilesConfig } from "../profiles";

export function setupProfileSwapEvent(profilesConfig: ProfilesConfig) {
	profilesConfig.hookManager.attach(ProfileEvent.Swap, (p) => {
		profilesConfig.getProfileIcons(p.name).then((bindings) => {
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
}
