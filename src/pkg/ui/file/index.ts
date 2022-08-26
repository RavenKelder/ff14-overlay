import fs from "fs";
import path from "path";
import config from "../../config";

const ICON_DIR = "icons";

const iconsDir = path.join(config.ASSETS_DIR, ICON_DIR);

export interface Icon {
	index: number;
	base64: string;
}

export async function getExistingFiles(profile = 0): Promise<Icon[]> {
	const files = fs.readdirSync(iconsDir);

	const results = files.map((filename) => {
		const [fileProfile, index] = path.basename(filename, ".png").split("_");

		if (profile.toString() !== fileProfile) {
			return null;
		}
		return new Promise<Icon>((res, rej) => {
			fs.readFile(path.join(iconsDir, filename), (err, data) => {
				if (err !== null) {
					rej(err);
				} else {
					res({
						index: parseInt(index),
						base64: !isNaN(parseInt(index))
							? data.toString("base64")
							: "",
					});
				}
			});
		});
	});

	const iconsOnly: Icon[] = [];
	(await Promise.all(results))
		.filter((icon) => {
			if (icon === null) {
				return false;
			}

			return icon.base64 !== "";
		})
		.forEach((i) => {
			if (i !== null && i.base64 !== "") {
				iconsOnly.push(i);
			}
		});

	return iconsOnly;
}

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

	new Promise((res, rej) => {
		fs.writeFile(path.join(iconsDir, `${index}.png`), f, (err) => {
			if (err !== null) {
				rej(err);
			} else {
				res(null);
			}
		});
	});

	return f.toString("base64");
}
