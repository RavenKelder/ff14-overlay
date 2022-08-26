declare global {
	interface Window {
		electronAPI: {
			ipcRendererOn: (
				channel: string,
				callback: (
					event: Electron.IpcRendererEvent,
					...args: unknown[]
				) => void,
			) => void;
			ipcRendererOff: (
				channel: string,
				callback: (
					event: Electron.IpcRendererEvent,
					...args: unknown[]
				) => void,
			) => void;
			ipcRendererSend: (channel: string, ...args: unknown[]) => void;
		};
	}
}
export {};
