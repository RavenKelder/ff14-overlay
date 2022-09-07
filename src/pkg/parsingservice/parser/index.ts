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
	PlayerStatsID,
	PlayerStats,
	Entity,
	CustomPrimaryPlayerEntityStatusID,
	CustomPrimaryPlayerEntityStatus,
	NetworkUpdateHPID,
	NetworkUpdateHP,
	AddCombatantID,
	AddCombatant,
	OverlayPluginEnmityTargetDataID,
	OverlayPluginEnmityTargetData,
	NetworkDeathID,
	NetworkDeath,
	OverlayPluginOnlineStatusChangedID,
	OverlayPluginOnlineStatusChanged,
} from "./events";
import { Hook, HookManager } from "../../ui/hooks";
import { AbilityManager } from "./ability";

interface State {
	primaryPlayer: string;
	primaryPlayerID: string;
	inCombat: boolean;
	abilityManager: AbilityManager;
	lastOnlineStatus: OverlayPluginOnlineStatusChanged | null;
}

interface Emitter {
	start(): Promise<void> | void;
	stop(): Promise<void> | void;
	attachHook(event: string, hook: Hook<unknown>): string;
	detachHook(event: string, id: string): boolean;
}

export class Parser {
	hooks: HookManager<ParseEvent>;
	state: State;
	emitter: Emitter;

	constructor(emitter: Emitter, abilityManager: AbilityManager) {
		this.hooks = new HookManager();
		this.state = {
			primaryPlayer: "",
			primaryPlayerID: "",
			inCombat: false,
			abilityManager: abilityManager,
			lastOnlineStatus: null,
		};
		this.emitter = emitter;
		this.setupCustomEvents();
	}

	async start(): Promise<void> {
		this.emitter.attachHook("ChangePrimaryPlayer", (m) => {
			const message = m as {
				charID: number;
				charName: string;
			};

			const playerID = message.charID.toString(16).toUpperCase();
			const playerName = message.charName;
			this.setPlayer(playerID, playerName);
			console.log(`Changing player to ${playerName}`);
		});

		this.emitter.attachHook("LogLine", (m) => {
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

		this.emitter.attachHook("CombatData", (m) => {
			const message = m as CombatStatusRaw;

			this.hooks.run(
				CustomCombatStatusID,
				new CustomCombatStatus(message),
			);

			if (
				message.isActive === "true" &&
				Object.keys(message.Combatant).includes("YOU")
			) {
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

		this.emitter.attachHook("EnmityTargetData", (m) => {
			this.hooks.run(
				OverlayPluginEnmityTargetDataID,
				new OverlayPluginEnmityTargetData(m),
			);
		});

		this.emitter.attachHook("OnlineStatusChanged", (m) => {
			const event = new OverlayPluginOnlineStatusChanged(m);
			if (this.state.primaryPlayerID === event.target) {
				this.state.lastOnlineStatus = event;
				this.hooks.run(OverlayPluginOnlineStatusChangedID, event);
			}
		});

		this.emitter.start();
	}

	stop(): Promise<void> {
		return Promise.resolve(this.emitter.stop());
	}

	parse(line: string): ParseEvent {
		const values = line.split(DELIMITER);
		switch (values[0]) {
			case NetworkAbilityID:
			case NetworkAOEAbilityID:
				return new NetworkAbility(line);
			case ChangePrimaryPlayerID:
				return new ChangePrimaryPlayer(line);
			case PlayerStatsID:
				return new PlayerStats(line);
			case NetworkUpdateHPID:
				return new NetworkUpdateHP(line);
			case AddCombatantID:
				return new AddCombatant(line);
			case NetworkDeathID:
				return new NetworkDeath(line);
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

	entityIsPrimaryPlayer(entity: Pick<Entity, "ID" | "name">): boolean {
		return (
			(this.state.primaryPlayerID !== "" &&
				entity.ID === this.state.primaryPlayerID) ||
			(this.state.primaryPlayerID === "" &&
				entity.name === this.state.primaryPlayer)
		);
	}

	setupCustomEvents() {
		this.hooks.attach(NetworkUpdateHPID, (e) => {
			if (!(e instanceof NetworkUpdateHP)) {
				return;
			}

			if (this.entityIsPrimaryPlayer(e.entity)) {
				this.hooks.run(
					CustomPrimaryPlayerEntityStatusID,
					new CustomPrimaryPlayerEntityStatus(e.entity),
				);
			}
		});

		this.hooks.attach(AddCombatantID, (e) => {
			if (!(e instanceof AddCombatant)) {
				return;
			}

			if (this.entityIsPrimaryPlayer(e.entity)) {
				this.hooks.run(
					CustomPrimaryPlayerEntityStatusID,
					new CustomPrimaryPlayerEntityStatus(e.entity),
				);
			}
		});

		const networkAbilityHook: Hook<ParseEvent> = (e) => {
			if (!(e instanceof NetworkAbility)) {
				return;
			}

			if (this.entityIsPrimaryPlayer(e.source)) {
				this.hooks.run(
					CustomPrimaryPlayerEntityStatusID,
					new CustomPrimaryPlayerEntityStatus(e.source),
				);
			} else if (this.entityIsPrimaryPlayer(e.target)) {
				this.hooks.run(
					CustomPrimaryPlayerEntityStatusID,
					new CustomPrimaryPlayerEntityStatus(e.target),
				);
			}

			if (this.entityIsPrimaryPlayer(e.source)) {
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

		this.hooks.attach(NetworkAbilityID, networkAbilityHook);
		this.hooks.attach(NetworkAOEAbilityID, networkAbilityHook);
	}
}
