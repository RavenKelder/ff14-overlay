import fs from "fs";

export async function getFileBase64(
	index: number,
	filename: string,
): Promise<string> {
	const f = await new Promise<Buffer>((res, rej) => {
		fs.readFile(filename, (err, data) => {
			if (err !== null) {
				rej(err);
			} else {
				res(data);
			}
		});
	});

	return f.toString("base64");
}
