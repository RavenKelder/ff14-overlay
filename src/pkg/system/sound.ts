import Speaker from "speaker";
import fs from "fs";
import path from "path";
import wav from "wav";

const SOUNDS_DIR = "./assets/sounds";

export function play(filename: string) {
	fs.open(path.join(SOUNDS_DIR, `${filename}.wav`), (err) => {
		if (err !== null) {
			console.error(`Failed playing sound ${filename}: ${err}`);
			return;
		}
		const reader = new wav.Reader();
		reader.once("format", function (format) {
			// the WAVE header is stripped from the output of the reader

			const speaker = new Speaker(format);
			reader.pipe(speaker);
		});

		const file = fs.createReadStream(
			path.join(SOUNDS_DIR, `${filename}.wav`),
		);
		file.pipe(reader);
	});
}
