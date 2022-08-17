// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
	ipcRendererOn: (
		channel: string,
		callback: (
			event: Electron.IpcRendererEvent,
			...args: unknown[]
		) => void,
	) => {
		ipcRenderer.on(channel, callback);
	},
	ipcRendererOff: (
		channel: string,
		callback: (
			event: Electron.IpcRendererEvent,
			...args: unknown[]
		) => void,
	) => {
		ipcRenderer.off(channel, callback);
	},
	ipcRendererSend: (channel: string, ...args: unknown[]) => {
		ipcRenderer.send(channel, ...args);
	},
});

ipcRenderer.setMaxListeners(24);
