export async function runAndSetInterval(
	command: (runNumber: number) => Promise<boolean>,
	interval: number,
) {
	let runNumber = 0;
	const ok = await command(runNumber);
	if (!ok) {
		return;
	}

	return new Promise<void>((res) => {
		const timer = setInterval(() => {
			command(runNumber++).then((ok) => {
				if (!ok) {
					clearInterval(timer);
					res();
				}
			});
		}, interval);
	});
}
