import { Menu, Tray } from "electron";
import { ProfilesConfig } from "../profiles";
import { restartMenu } from ".";

let tray: Tray | null = null;

interface CreateTrayOptions {
	icon: string;
	profilesConfig: ProfilesConfig;
	close: () => void;
}

export async function createTray(opts: CreateTrayOptions) {
	if (tray !== null) {
		throw new Error("cannot create more than one tray");
	}
	tray = new Tray(opts.icon);
	const profiles = await opts.profilesConfig.getAwaitedProfiles();
	const profileMenu: Electron.MenuItemConstructorOptions[] = profiles.map(
		(p) => ({
			label: "Profile " + p.name,
			type: "normal",
			click: () => {
				opts.profilesConfig.setCurrentProfile(p.name);
			},
		}),
	);
	const contextMenu = Menu.buildFromTemplate([
		...profileMenu,
		{
			label: "Refresh",
			type: "normal",
			click: () => {
				restartMenu();
			},
		},
		{
			label: "Exit",
			type: "normal",
			click: () => {
				opts.close();
			},
		},
	]);
	tray.setToolTip("FF14 Overlay");
	tray.setContextMenu(contextMenu);
}

export function closeTray() {
	tray?.destroy();
}
