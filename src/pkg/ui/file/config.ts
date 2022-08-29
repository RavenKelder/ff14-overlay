import fs from "fs";

export class FileConfig<T> {
	config: T | null = null;
	ready: Promise<void>;
	filename: string;
	decoder: (b: Buffer) => T;
	encoder: (t: T) => Buffer;
	constructor(
		filename: string,
		decoder: (b: Buffer) => T,
		encoder: (t: T) => Buffer,
		initial: T | null = null,
	) {
		this.filename = filename;
		this.encoder = encoder;
		this.decoder = decoder;
		this.ready = new Promise<void>((res, rej) => {
			fs.readFile(filename, (err, data) => {
				let init = {} as T;
				if (initial !== null) {
					init = initial;
				}
				if (err) {
					if (err.code === "ENOENT") {
						fs.writeFile(filename, this.encoder(init), (err) => {
							if (err !== null) {
								rej(err);
							} else {
								this.config = init;
								res();
							}
						});
						return;
					}

					throw err;
				} else {
					this.config = {
						...init,
						...this.decoder(data),
					};
					res();
				}
			});
		});
	}

	async set(value: T, save = false): Promise<void> {
		await this.ready;
		this.config = value;

		if (save) {
			await this.save();
		}
	}

	async get(): Promise<T> {
		await this.ready;
		if (this.config === null) {
			throw new Error("(FileConfig.get) config is unexpectedly null");
		}
		return this.config;
	}

	save(): Promise<void> {
		return new Promise<void>((res, rej) => {
			if (this.config === null) {
				rej("(FileConfig.save) config is unexpectedly null");
				return;
			}
			fs.writeFile(this.filename, this.encoder(this.config), (err) => {
				if (err !== null) {
					rej(err);
				} else {
					res();
				}
			});
		});
	}

	delete(): Promise<void> {
		return new Promise<void>((res, rej) => {
			fs.rm(this.filename, { recursive: true, force: true }, (err) => {
				if (err) {
					rej(err);
					return;
				}

				res();
			});
		});
	}
}

export class JSONFileConfig<T> extends FileConfig<T> {
	constructor(filename: string, initial: T | null = null) {
		super(
			filename,
			(b: Buffer) => {
				return JSON.parse(b.toString());
			},
			(t: T) => {
				return Buffer.from(JSON.stringify(t, null, "\t"));
			},
			initial,
		);
	}
}
