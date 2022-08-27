import fs from "fs";
import path from "path";

const PROFILE_DIR = "assets/profiles";

interface Config {
	default: string;
}

interface Binding {
	segment: number;
	command: string[];
	ability: string;
	iconPath: string;
}

interface BindingData extends Binding {
	iconBase64: string;
}

interface Profile {
	jobID?: string;
	name: string;
	bindings: Binding[];
}

let currentProfile: Profile | null = null;

export const profileReady = new Promise<void>((res, rej) => {
	getCurrentProfile()
		.then(() => {
			res();
		})
		.catch(rej);
});

export async function createProfile(profile: Profile): Promise<void> {
	const profilePath = path.join(PROFILE_DIR, profile.name);
	if (fs.existsSync(profilePath)) {
		throw new Error(`profile ${profile.name} already exists`);
	}

	await new Promise<void>((res, rej) => {
		fs.mkdir(profilePath, (err) => {
			if (err) {
				rej(err);
				return;
			}

			res();
		});
	});

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { name, ...rest } = profile;
	const configContent = { ...rest };

	await new Promise<void>((res, rej) => {
		fs.writeFile(
			path.join(profilePath, "config.json"),
			JSON.stringify(configContent),
			(err) => {
				if (err) {
					rej(err);
					return;
				}
				res();
			},
		);
	});
}

export async function deleteProfile(profile: string): Promise<void> {
	const profilePath = path.join(PROFILE_DIR, profile);
	if (!fs.existsSync(profilePath)) {
		throw new Error(`profile ${profile} does not exist`);
	}

	if (currentProfile?.name === profile) {
		currentProfile = null;
	}

	return new Promise<void>((res, rej) => {
		fs.rm(profilePath, { recursive: true, force: true }, (err) => {
			if (err) {
				rej(err);
				return;
			}

			res();
		});
	});
}

export async function getCurrentProfile(): Promise<Profile> {
	if (currentProfile !== null) {
		return currentProfile;
	}
	const configFile = path.join(PROFILE_DIR, "config.json");
	return new Promise((res, rej) => {
		fs.readFile(configFile, (err, f) => {
			if (err) {
				rej(err);
			}

			const config = JSON.parse(f.toString());
			const c = config as Config;

			if (c.default) {
				getProfile(c.default)
					.then((p) => {
						currentProfile = p;
						res(p);
					})
					.catch(rej);
				return;
			}

			getProfiles().then((profiles) => {
				if (profiles.length === 0) {
					rej(new Error("no profiles exist"));
				}
				const configOut: Config = { ...c, default: profiles[0].name };
				fs.writeFile(configFile, JSON.stringify(configOut), (err) => {
					if (err) {
						rej(err);
						return;
					}
					console.log(`Setting default profile ${profiles[0].name}`);

					currentProfile = profiles[0];
					res(profiles[0]);
				});
			});
		});
	});
}

export interface BindingSelect {
	segment?: number;
	ability?: string;
}

export async function getCurrentProfileBinding(
	selection: BindingSelect,
): Promise<Binding | null> {
	await profileReady;

	if (currentProfile === null) {
		console.warn(
			"Attempting to get profile binding from null current profile",
		);
		return null;
	}

	for (let i = 0; i < currentProfile.bindings.length; i++) {
		if (compareBindingSelection(selection, currentProfile.bindings[i])) {
			return currentProfile.bindings[i];
		}
	}

	return null;
}

export async function setCurrentProfile(profile: string): Promise<void> {
	const configFile = path.join(PROFILE_DIR, "config.json");
	const profilePath = path.join(PROFILE_DIR, profile);
	if (!fs.existsSync(profilePath)) {
		throw new Error(`profile ${profile} does not exist`);
	}

	await new Promise<void>((res, rej) => {
		fs.readFile(configFile, (err, f) => {
			if (err) {
				rej(err);
			}

			const config = JSON.parse(f.toString());
			const c = config as Config;
			const configOut: Config = { ...c, default: profile };
			fs.writeFile(configFile, JSON.stringify(configOut), (err) => {
				if (err) {
					rej(err);
					return;
				}
				res();
			});
		});
	});

	currentProfile = await getProfile(profile);
}

export async function getProfile(profile: string): Promise<Profile> {
	if (profile === currentProfile?.name) {
		return currentProfile;
	}
	const config = await new Promise((res, rej) => {
		fs.readFile(
			path.join(PROFILE_DIR, profile, "config.json"),
			(err, f) => {
				if (err) {
					rej(err);
				}

				res(JSON.parse(f.toString()));
			},
		);
	});
	const p = parseProfileConfig(config);
	const bindings = p.bindings.map((b) => {
		return {
			...b,
			iconPath: path.join(PROFILE_DIR, profile, `${b.segment}.png`),
		};
	});
	return {
		...p,
		bindings: bindings,
		name: profile,
	};
}

export async function getProfileByJobID(
	jobID: string,
): Promise<Profile | null> {
	if (jobID === currentProfile?.jobID) {
		return currentProfile;
	}

	const profiles = await getProfiles();

	for (let i = 0; i < profiles.length; i++) {
		if (profiles[i].jobID === jobID) {
			return profiles[i];
		}
	}

	return null;
}

export function getProfileIcons(profile: Profile): Promise<BindingData[]> {
	const bindings: Promise<BindingData>[] = profile.bindings.map((b) => {
		return new Promise((res, rej) => {
			fs.readFile(b.iconPath, (err, f) => {
				if (err) {
					rej(err);
					return;
				}

				res({
					...b,
					iconBase64: f.toString("base64"),
				});
			});
		});
	});

	return Promise.all(bindings);
}

export function getProfiles(): Promise<Profile[]> {
	return new Promise((res, rej) => {
		fs.readdir(PROFILE_DIR, (err, dirs) => {
			if (err) {
				rej(err);
			}

			dirs = dirs.filter((dir) => dir !== "config.json");

			res(Promise.all(dirs.map(getProfile)));
		});
	});
}

function parseProfileConfig(p: unknown): Omit<Profile, "name"> {
	if (typeof p !== "object") {
		throw new Error("invalid typeof profile");
	}

	if ((p as Profile).bindings === undefined) {
		throw new Error("profile config has no bindings");
	}

	return p as Profile;
}

function compareBindingSelection(a: BindingSelect, b: Binding): boolean {
	if (a.ability !== undefined && a.segment !== undefined) {
		return a.ability === b.ability && a.segment === b.segment;
	} else if (a.ability !== undefined) {
		return a.ability === b.ability;
	} else {
		return a.segment === b.segment;
	}
}
