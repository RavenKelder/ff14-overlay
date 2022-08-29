import fs from "fs";
import path from "path";
import { JSONFileConfig } from "../file/config";
import { HookManager } from "../hooks";

const PROFILE_DIR = "assets/profiles";

export enum ProfileEvent {
	Swap = "profile-swap",
}

interface Config {
	default: string;
	sendMouseToCentre: boolean;
	openMenu: string;
	openGameUI: [];
	closeGameUI: [];
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

export class ProfilesConfig {
	profilesDir: string;
	config: JSONFileConfig<Config>;
	currentProfile: JSONFileConfig<Profile> | null;
	profiles: JSONFileConfig<Profile>[];
	hookManager: HookManager<Profile>;
	constructor(profilesDir: string) {
		this.profilesDir = profilesDir;
		const configFile = path.join(profilesDir, "config.json");
		this.config = new JSONFileConfig<Config>(configFile);
		this.currentProfile = null;
		this.profiles = [];
		this.hookManager = new HookManager<Profile>();
	}

	async setup(): Promise<void> {
		await this.config.ready;

		console.log("(ProfilesConfig.setup) Setting up profiles...");

		this.profiles = await new Promise<JSONFileConfig<Profile>[]>(
			(res, rej) => {
				fs.readdir(PROFILE_DIR, (err, dirs) => {
					if (err) {
						console.error(`Error getting file: ${err}`);
						rej(err);
					}

					dirs = dirs.filter((dir) => dir !== "config.json");

					res(
						Promise.all(
							dirs.map((p) => {
								const profilePath = path.join(
									this.profilesDir,
									p,
									"config.json",
								);
								return new JSONFileConfig<Profile>(
									profilePath,
									{
										bindings: [],
										name: p,
									},
								);
							}),
						),
					);
				});
			},
		);

		if (this.profiles.length === 0) {
			throw new Error("no profiles found");
		}

		console.log("(ProfilesConfig.setup) Getting default profile...");

		const defaultProfileName = (await this.config.get()).default;

		const awaitedProfiles = await Promise.all(
			this.profiles.map((p) => p.get()),
		);

		for (let i = 0; i < awaitedProfiles.length; i++) {
			if (awaitedProfiles[i].name === defaultProfileName) {
				this.currentProfile = this.profiles[i];
			}
		}

		if (this.currentProfile === null) {
			this.currentProfile = this.profiles[0];
		}

		await Promise.all(
			this.profiles.map((p) => {
				return new Promise<void>((res) => {
					p.get().then((profile) => {
						const bindings = profile.bindings;

						const resolvedPath = path.resolve(
							path.join(this.profilesDir, profile.name),
						);

						profile.bindings = bindings.map((b) => {
							return {
								...b,
								iconPath: path.join(
									resolvedPath,
									`${b.segment.toString()}.png`,
								),
							};
						});

						p.set(profile, true).then(res);
					});
				});
			}),
		);

		console.log("(ProfilesConfig.setup) Setup complete.");
	}

	async getConfig(): Promise<Config> {
		return this.config.get();
	}

	async getAwaitedProfiles(): Promise<Profile[]> {
		return Promise.all(this.profiles.map((p) => p.get()));
	}

	async getProfile(profileName: string): Promise<Profile> {
		const profiles = await this.getAwaitedProfiles();

		for (let i = 0; i < profiles.length; i++) {
			if (profiles[i].name === profileName) {
				return profiles[i];
			}
		}

		throw new Error(
			`(ProfilesConfig.getProfile) profile ${profileName} does not exist`,
		);
	}

	async getProfileByJobID(jobID: string): Promise<Profile | null> {
		const awaitedProfiles = await this.getAwaitedProfiles();
		for (let i = 0; i < awaitedProfiles.length; i++) {
			if (awaitedProfiles[i].jobID === jobID) {
				return awaitedProfiles[i];
			}
		}

		return null;
	}

	async getCurrentProfile(): Promise<Profile> {
		if (this.currentProfile === null) {
			throw new Error(
				"(ProfilesConfig.getCurrentProfile) current profile unexpectedly null",
			);
		}
		return this.currentProfile.get();
	}

	async getCurrentProfileBinding(
		selection: BindingSelect,
	): Promise<Binding | null> {
		if (this.currentProfile === null) {
			console.warn(
				"Attempting to get profile binding from null current profile",
			);
			return null;
		}

		const bindings = (await this.getCurrentProfile()).bindings;

		for (let i = 0; i < bindings.length; i++) {
			if (compareBindingSelection(selection, bindings[i])) {
				return bindings[i];
			}
		}

		return null;
	}

	async setCurrentProfile(profileName: string): Promise<void> {
		const awaitedCurrentProfile = await this.getCurrentProfile();
		if (awaitedCurrentProfile.name === profileName) {
			return;
		}

		const awaitedProfiles = await this.getAwaitedProfiles();

		return new Promise<void>((res, rej) => {
			for (let i = 0; i < awaitedProfiles.length; i++) {
				if (awaitedProfiles[i].name === profileName) {
					this.currentProfile = this.profiles[i];
					this.profiles[i].get().then((p) => {
						this.hookManager.run(ProfileEvent.Swap, p);
					});

					this.config.get().then((c) => {
						this.config
							.set({ ...c, default: profileName }, true)
							.then(() => {
								res();
							});
					});
					return;
				}
			}

			rej(
				new Error(
					`(ProfilesConfig.setCurrentProfile) profile ${profileName} does not exist`,
				),
			);
		});
	}

	async getProfileIcons(profileName: string): Promise<BindingData[]> {
		const profile = await this.getProfile(profileName);
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
}

export interface BindingSelect {
	segment?: number;
	ability?: string;
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
