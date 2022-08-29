import { ProfilesConfig } from "../../ui/profiles";
import config from "../../config";
import { AbilityState } from "./events";

export class AbilityManager {
	profilesConfig: ProfilesConfig;
	abilities: Record<string, AbilityState> = {};

	constructor(profilesConfig: ProfilesConfig) {
		this.profilesConfig = profilesConfig;
		const abilities = Object.values(config.abilities);
		abilities.forEach((a) => {
			this.abilities[a.name] = {
				...a,
				currentCharges: a.charges,
				lastOnCooldowns: [...Array(a.charges).keys()].map(() => {
					const d = new Date();
					d.setTime(0);
					return d;
				}),
			};
		});
	}

	getAbilityByName(name: string): AbilityState | null {
		if (Object.prototype.hasOwnProperty.call(this.abilities, name)) {
			return this.abilities[name];
		} else {
			return null;
		}
	}

	putAbilityOnCooldownByName(name: string): AbilityState | null {
		if (!Object.prototype.hasOwnProperty.call(this.abilities, name)) {
			return null;
		}

		const lastOnCooldownsLength =
			this.abilities[name].lastOnCooldowns.length;

		this.abilities[name] = {
			...this.abilities[name],
			currentCharges: Math.max(
				this.abilities[name].currentCharges - 1,
				0,
			),
			lastOnCooldowns: [
				new Date(),
				...this.abilities[name].lastOnCooldowns.slice(
					0,
					lastOnCooldownsLength - 1,
				),
			],
		};
		return this.abilities[name];
	}

	putAbilityOffCooldownByName(name: string): AbilityState | null {
		if (!Object.prototype.hasOwnProperty.call(this.abilities, name)) {
			return null;
		}

		this.abilities[name] = {
			...this.abilities[name],
			currentCharges: Math.min(
				this.abilities[name].currentCharges + 1,
				this.abilities[name].charges,
			),
		};

		return this.abilities[name];
	}

	async getAbilityBySegment(segment: number): Promise<AbilityState | null> {
		return this.profilesConfig
			.getCurrentProfileBinding({ segment })
			.then((binding) => {
				if (binding === null) {
					return null;
				}

				return this.abilities[binding.ability] ?? null;
			});
	}
}
