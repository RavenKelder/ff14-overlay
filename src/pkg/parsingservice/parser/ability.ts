import { Ability, Binding } from "../config";
import { AbilityState } from "./events";

export class AbilityManager {
	abilities: Record<string, AbilityState> = {};
	abilitiesBySegment: Record<number, string> = {};

	constructor(abilities: Ability[], bindings: Binding[]) {
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

		bindings.forEach((b) => {
			if (!Object.keys(this.abilities).includes(b.ability)) {
				throw new Error(
					`binding includes invalid ability ${b.ability} at segment ${b.segment}`,
				);
			}
			this.abilitiesBySegment[b.segment] = b.ability;
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

	getAbilityBySegment(segment: number): AbilityState | null {
		if (
			Object.prototype.hasOwnProperty.call(
				this.abilitiesBySegment,
				segment,
			)
		) {
			return this.abilities[this.abilitiesBySegment[segment]];
		} else {
			return null;
		}
	}
}
