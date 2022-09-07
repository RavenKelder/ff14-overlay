import { dialog, ipcMain, IpcMainEvent } from "electron";
import { getFileBase64 } from "../file";
import { pressKeys } from "../system/keyboard";

export enum Channel {
	OK = "ok",
	StartOK = "start-ok",
	StartOptions = "start-options",
	MenuOpen = "menu-open",
	MenuClose = "menu-close",
	FileReceive = "file-receive",
	FileRequest = "file-request",
	SegmentSelect = "segment-select",
	SegmentCooldown = "segment-cooldown",
	SegmentHover = "segment-hover",
	Combat = "combat",
	AbilityChargesRequest = "ability-charges-request",
	AbilityChargesReceive = "ability-charges-receive",
	ChangePrimaryPlayer = "change-primary-player",
	EmnityDataTarget = "emnity-data-target",
	EmnityDataPrimaryPlayer = "emnity-data-primary-player",
	OnlineStatusChanged = "online-status-changed",
}

let startOK: (event: IpcMainEvent) => void;
let segmentSelect: (event: IpcMainEvent, index: number) => void;

function fileReceive(event: IpcMainEvent, index: number) {
	const result = dialog.showOpenDialog({
		properties: ["openFile"],
		filters: [{ name: "Images", extensions: ["png"] }],
	});

	result.then(({ canceled, filePaths }) => {
		if (canceled) {
			event.reply(Channel.FileReceive, "", NaN);
			return;
		}

		getFileBase64(index, filePaths[0]).then((base64) => {
			event.reply(Channel.FileReceive, base64, index);
		});
	});
}

// Setup on start actions.
export function setupStartOK(
	options: Record<string, string | number | boolean>,
	callback: (event: IpcMainEvent) => void,
) {
	if (startOK) {
		ipcMain.off(Channel.StartOK, startOK);
	}

	startOK = (event) => {
		event.reply(Channel.StartOptions, options);

		callback(event);
	};

	ipcMain.on(Channel.StartOK, startOK);
}

// Setup handling when segments are selected from menu.
export function setupSegmentSelect(binding: Record<number, string[]>) {
	if (segmentSelect) {
		ipcMain.off(Channel.SegmentSelect, segmentSelect);
	}

	segmentSelect = (event: IpcMainEvent, index: number) => {
		if (binding[index]) {
			pressKeys(binding[index]);
			event.reply(Channel.OK, true);
		} else {
			event.reply(Channel.OK, false);
		}
	};

	ipcMain.on(Channel.SegmentSelect, segmentSelect);
}

// Setup sending icon file data to menu.
export function setupFileResponse() {
	ipcMain.on(Channel.FileRequest, fileReceive);
}
