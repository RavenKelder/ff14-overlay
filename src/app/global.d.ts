declare global {
	function addOverlayListener(
		event: string,
		callback: (data: unknown) => void,
	);
	function startOverlayEvents(): void;
	interface Window {
		addOverlayListener(event: string, callback: (data: unknown) => void);
		startOverlayEvents(): void;
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
