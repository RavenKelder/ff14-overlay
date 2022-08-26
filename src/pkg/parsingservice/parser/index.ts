import {
	DELIMITER,
	ParseEvent,
	NetworkAbility,
	NetworkAbilityID,
	NetworkAOEAbilityID,
	ChangePrimaryPlayerID,
	ChangePrimaryPlayer,
	CustomOffCooldownID,
	CustomOffCooldown,
	CustomOnCooldownID,
	CustomOnCooldown,
	AbilityState,
	CustomInCombatID,
	CustomInCombat,
	CustomOutOfCombatID,
	CustomCombatStatusID,
	CombatStatusRaw,
	CustomCombatStatus,
} from "./events";
import { Hook, HookManager } from "../../ui/hooks";
import { AbilityManager } from "./ability";
import { addOverlayPluginHook } from "../overlayplugin";

interface State {
	primaryPlayer: string;
	primaryPlayerID: string;
	inCombat: boolean;
	abilityManager: AbilityManager;
}

export class Parser {
	hooks: HookManager<ParseEvent>;
	state: State;

	constructor() {
		this.hooks = new HookManager();
		this.state = {
			primaryPlayer: "",
			primaryPlayerID: "",
			inCombat: false,
			abilityManager: new AbilityManager(),
		};
		this.setupCustomEvents();
	}

	async start(): Promise<void> {
		addOverlayPluginHook("ChangePrimaryPlayer", (m) => {
			const message = m as {
				charID: number;
				charName: string;
			};

			const playerID = message.charID.toString(16).toUpperCase();
			const playerName = message.charName;
			this.setPlayer(playerID, playerName);
			console.log(`Changing player to ${playerName}`);
		});

		addOverlayPluginHook("LogLine", (m) => {
			const message = m as {
				rawLine: string;
			};

			const event = this.parse(message.rawLine);
			try {
				this.hooks.run(event.ID, event);
			} catch (err) {
				console.error(
					`failed running hook with ID ${event.ID}: ${err}`,
				);
			}
		});

		addOverlayPluginHook("CombatData", (m) => {
			const message = m as CombatStatusRaw;

			this.hooks.run(
				CustomCombatStatusID,
				new CustomCombatStatus(message),
			);

			if (message.isActive === "true") {
				if (!this.state.inCombat) {
					this.hooks.run(CustomInCombatID, new CustomInCombat(""));
				}
				this.state.inCombat = true;
			} else {
				if (this.state.inCombat) {
					this.hooks.run(CustomOutOfCombatID, new CustomInCombat(""));
				}
				this.state.inCombat = false;
			}
		});
	}

	stop() {
		return;
	}

	parse(line: string): ParseEvent {
		const values = line.split(DELIMITER);
		switch (values[0]) {
			case NetworkAbilityID:
			case NetworkAOEAbilityID:
				return new NetworkAbility(line);
			case ChangePrimaryPlayerID:
				return new ChangePrimaryPlayer(line);
		}

		return new ParseEvent(line);
	}

	async getAbilityBySegment(segment: number): Promise<AbilityState | null> {
		const ability = await this.state.abilityManager.getAbilityBySegment(
			segment,
		);
		if (ability === null) {
			return null;
		}
		return ability;
	}

	setInCombat(inCombat: boolean) {
		this.state.inCombat = inCombat;
	}

	getInCombat(): boolean {
		return this.state.inCombat;
	}

	setPlayer(id: string, name: string) {
		this.state = {
			...this.state,
			primaryPlayer: name,
			primaryPlayerID: id,
		};
	}

	setupCustomEvents() {
		const cooldownsHook: Hook<ParseEvent> = (e) => {
			if (!(e instanceof NetworkAbility)) {
				return;
			}

			if (
				(this.state.primaryPlayerID !== "" &&
					e.source.ID === this.state.primaryPlayerID) ||
				(this.state.primaryPlayerID === "" &&
					e.source.name === this.state.primaryPlayer)
			) {
				let ability = this.state.abilityManager.getAbilityByName(
					e.ability,
				);
				if (ability === null || ability.cooldown <= 0) {
					return;
				}

				ability = this.state.abilityManager.putAbilityOnCooldownByName(
					e.ability,
				);
				if (ability === null) {
					return;
				}

				this.hooks.run(
					CustomOnCooldownID,
					new CustomOnCooldown(ability),
				);

				setTimeout(() => {
					const ability =
						this.state.abilityManager.putAbilityOffCooldownByName(
							e.ability,
						);
					if (ability === null) {
						return;
					}

					this.hooks.run(
						CustomOffCooldownID,
						new CustomOffCooldown(e.timestamp, ability),
					);
				}, 1000 * ability.cooldown);
			}
		};

		this.hooks.attach(NetworkAbilityID, cooldownsHook);
		this.hooks.attach(NetworkAOEAbilityID, cooldownsHook);
	}
}
