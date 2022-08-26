import { app, Menu, Tray } from "electron";
import driver from "./pkg/ui/driver";
import { Channel } from "./pkg/ui/ipc";
import {
	getProfile,
	getProfileIcons,
	getProfiles,
	setCurrentProfile,
} from "./pkg/ui/profiles";
import { getMenuAndRun, restartMenu } from "./pkg/ui/window";

let tray: Tray | null = null;

interface CreateTrayOptions {
	icon: string;
}

export async function createTray(opts: CreateTrayOptions) {
	if (tray !== null) {
		throw new Error("cannot create more than one tray");
	}
	tray = new Tray(opts.icon);
	const profiles = await getProfiles();
	const profileMenu: Electron.MenuItemConstructorOptions[] = profiles.map(
		(p) => ({
			label: "Profile " + p.name,
			type: "normal",
			click: () => {
				setCurrentProfile(p.name).then(() => {
					getProfile(p.name)
						.then(getProfileIcons)
						.then((bindings) => {
							getMenuAndRun(async (menu) => {
								restartMenu().then(() => {
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
				close();
			},
		},
	]);
	tray.setToolTip("FF14 Overlay");
	tray.setContextMenu(contextMenu);
}

function close() {
	driver
		.stop()
		.catch((err) => {
			console.error(err);
		})
		.finally(() => {
			tray?.destroy();
			app.quit();
		});
}
