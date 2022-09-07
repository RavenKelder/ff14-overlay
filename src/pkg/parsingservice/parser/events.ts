import { Vec3 } from "../../ui/maths";
import { calculateDirectional } from "./utils";

export const LogLineID = "00",
	// Occurs on entering new zones.
	ChangeZoneID = "01",
	// Provides character name, occurs on entering new zones (follows a ChangeZoneID).
	ChangePrimaryPlayerID = "02",
	AddCombatantID = "03",
	RemoveCombatantID = "04",
	PartyListID = "11",
	PlayerStatsID = "12",
	NetworkStartsCastingID = "20",
	NetworkAbilityID = "21",
	NetworkAOEAbilityID = "22",
	NetworkCancelAbilityID = "23",
	NetworkDoTID = "24",
	NetworkDeathID = "25",
	NetworkBuffID = "26",
	NetworkTargetIconID = "27",
	NetworkRaidMarkerID = "28",
	NetworkTargetMarkerID = "29",
	NetworkBuffRemoveID = "30",
	NetworkGaugeID = "31",
	NetworkWorldID = "32",
	Network6DID = "33",
	NetworkNameToggleID = "34",
	NetworkTetherID = "35",
	LimitBreakID = "36",
	NetworkActionSyncID = "37",
	NetworkStatusEffectsID = "38",
	NetworkUpdateHPID = "39",
	MapID = "40",
	SystemLogMessageID = "41",
	StatusList3Event = "42",
	DebugID = "251",
	PacketDumpID = "252",
	VersionID = "253",
	ErrorID = "254",
	UnknownID = "UNKNOWN",
	CustomInCombatID = "C00",
	CustomOutOfCombatID = "C01",
	CustomOnCooldownID = "C02",
	CustomOffCooldownID = "C03",
	CustomCombatStatusID = "C04",
	CustomPrimaryPlayerEntityStatusID = "C05",
	OverlayPluginEnmityTargetDataID = "C06",
	OverlayPluginOnlineStatusChangedID = "C07",
	DELIMITER = "|";

export class ParseEvent {
	rawValues: string[] = [];
	ID = "";
	timestamp: Date;
	constructor(line: string) {
		this.rawValues = line.split(DELIMITER);
		if (this.rawValues.length > 1) {
			this.ID = this.rawValues[0];
			this.timestamp = new Date(this.rawValues[1]);
		} else {
			this.ID = UnknownID;
			this.timestamp = new Date();
		}
	}

	string(): string {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { rawValues, ...rest } = this;
		return JSON.stringify({ ...rest });
	}
}

export interface Entity {
	ID: string;
	name: string;
	HP: number;
	maxHP: number;
	MP: number;
	maxMP: number;
	position: Vec3;
	heading: number;
}

export interface Ability {
	name: string;
	charges: number;
	cooldown: number;
}

export interface AbilityState extends Ability {
	currentCharges: number;
	lastOnCooldowns: Date[];
}

export enum Directional {
	Front = "FRONT",
	FlankLeft = "FLANK_LEFT",
	FlankRight = "FLANK_RIGHT",
	Rear = "REAR",
}

export class NetworkAbility extends ParseEvent {
	source: Entity;
	target: Entity;
	abilityID: string;
	ability: string;
	flags: string;
	rawDamage: string;
	directional: Directional | null;

	constructor(line: string) {
		super(line);

		this.abilityID = this.rawValues[4];
		this.ability = this.rawValues[5];
		this.flags = this.rawValues[8];
		this.rawDamage = this.rawValues[9];

		this.source = {
			ID: this.rawValues[2],
			name: this.rawValues[3],
			HP: parseInt(this.rawValues[34]),
			maxHP: parseInt(this.rawValues[35]),
			MP: parseInt(this.rawValues[36]),
			maxMP: parseInt(this.rawValues[37]),
			position: {
				x: parseFloat(this.rawValues[40]),
				y: parseFloat(this.rawValues[41]),
				z: parseFloat(this.rawValues[42]),
			},
			heading: parseFloat(this.rawValues[43]),
		};

		this.target = {
			ID: this.rawValues[6],
			name: this.rawValues[7],
			HP: parseInt(this.rawValues[24]),
			maxHP: parseInt(this.rawValues[25]),
			MP: parseInt(this.rawValues[26]),
			maxMP: parseInt(this.rawValues[27]),
			position: {
				x: parseFloat(this.rawValues[30]),
				y: parseFloat(this.rawValues[31]),
				z: parseFloat(this.rawValues[32]),
			},
			heading: parseFloat(this.rawValues[33]),
		};

		this.directional = calculateDirectional(this.source, this.target);
	}
}

export class ChangePrimaryPlayer extends ParseEvent {
	playerID: string;
	playerName: string;
	constructor(line: string) {
		super(line);
		this.playerID = this.rawValues[2];
		this.playerName = this.rawValues[3];
	}
}

export class PartyList extends ParseEvent {
	size: number;
	playerIDs: string[];

	constructor(line: string) {
		super(line);
		this.size = parseInt(this.rawValues[2]);
		this.playerIDs = this.rawValues.slice(3, 3 + this.size);
	}
}

export class CustomInCombat extends ParseEvent {
	constructor(line: string) {
		super(line);
	}
}

export class CustomOffCooldown extends ParseEvent {
	cooldownStartTime: Date;
	ability: AbilityState;
	constructor(start: Date, ability: AbilityState) {
		super("");
		this.ID = CustomOffCooldownID;
		this.cooldownStartTime = start;
		this.ability = ability;
	}
}

export class CustomOnCooldown extends ParseEvent {
	ability: AbilityState;
	constructor(ability: AbilityState) {
		super("");
		this.ID = CustomOnCooldownID;
		this.ability = ability;
	}
}

export interface CombatStatusRaw {
	Encounter: Record<string, string>;
	Combatant: Record<string, Record<string, string>>;
	isActive: string;
}

export interface CombatStatus {
	encounter: Record<string, string>;
	combatant: Record<string, Record<string, string>>;
	isActive: boolean;
}

export class CustomCombatStatus extends ParseEvent {
	status: CombatStatus;
	inCombat: boolean;

	constructor(message: CombatStatusRaw) {
		super("");
		this.ID = CustomCombatStatusID;
		this.status = {
			encounter: message.Encounter,
			combatant: message.Combatant,
			isActive: message.isActive === "true",
		};
		this.inCombat =
			Object.keys(this.status.combatant).includes("YOU") &&
			this.status.isActive;
	}
}

export class CustomPrimaryPlayerEntityStatus extends ParseEvent {
	entity: Entity;

	constructor(entity: Entity) {
		super("");
		this.ID = CustomPrimaryPlayerEntityStatusID;
		this.entity = entity;
	}
}

export class PlayerStats extends ParseEvent {
	jobID: string;

	constructor(line: string) {
		super(line);

		this.jobID = this.rawValues[2];
	}
}

export class NetworkUpdateHP extends ParseEvent {
	entity: Entity;

	constructor(line: string) {
		super(line);

		this.entity = {
			ID: this.rawValues[2],
			name: this.rawValues[3],
			HP: parseInt(this.rawValues[4]),
			maxHP: parseInt(this.rawValues[5]),
			MP: parseInt(this.rawValues[6]),
			maxMP: parseInt(this.rawValues[7]),
			position: {
				x: parseFloat(this.rawValues[10]),
				y: parseFloat(this.rawValues[11]),
				z: parseFloat(this.rawValues[12]),
			},
			heading: parseFloat(this.rawValues[13]),
		};
	}
}

export class AddCombatant extends ParseEvent {
	entity: Entity;

	constructor(line: string) {
		super(line);

		this.entity = {
			ID: this.rawValues[2],
			name: this.rawValues[3],
			HP: parseInt(this.rawValues[11]),
			maxHP: parseInt(this.rawValues[12]),
			MP: parseInt(this.rawValues[13]),
			maxMP: parseInt(this.rawValues[14]),
			position: {
				x: parseFloat(this.rawValues[17]),
				y: parseFloat(this.rawValues[18]),
				z: parseFloat(this.rawValues[19]),
			},
			heading: parseFloat(this.rawValues[20]),
		};
	}
}

export class OverlayPluginEnmityTargetData extends ParseEvent {
	target: Entity | null;
	aggression: "passive" | "aggressive";
	type: "player" | "npc" | "monster" | "item" = "item";

	constructor(message: unknown) {
		super("");
		this.ID = OverlayPluginEnmityTargetDataID;
		const m = message as {
			Target: {
				ID: number;
				Name: string;
				MaxHP: number;
				CurrentHP: number;
				PosX: number;
				PosY: number;
				PosZ: number;
				Rotation: number;
				Type: number;
			};
			Entries: {
				isMe: boolean;
			}[];
		};

		this.aggression = "passive";
		if (m.Entries) {
			for (let i = 0; i < m.Entries.length; i++) {
				if (m.Entries[i].isMe) {
					this.aggression = "aggressive";
					break;
				}
			}
		}

		if (m.Target) {
			this.target = {
				ID: m.Target.ID.toString(16).toUpperCase(),
				name: m.Target.Name,
				HP: m.Target.CurrentHP,
				maxHP: m.Target.MaxHP,
				position: {
					x: m.Target.PosX,
					y: m.Target.PosY,
					z: m.Target.PosZ,
				},
				heading: m.Target.Rotation,
				maxMP: 0,
				MP: 0,
			};

			switch (m.Target.Type) {
				case 1:
					this.type = "player";
					break;
				case 2:
					this.type = "monster";
					break;
				case 3:
					this.type = "npc";
					break;
				default:
					this.type = "item";
			}
		} else {
			this.target = null;
		}
	}
}

export class OverlayPluginOnlineStatusChanged extends ParseEvent {
	target: string;
	status: string;
	constructor(message: unknown) {
		super("");
		this.ID = OverlayPluginOnlineStatusChangedID;
		const m = message as {
			type: string;
			target: number;
			status: string;
		};
		this.target = m.target.toString(16).toUpperCase();
		this.status = m.status;
	}
}

export class NetworkDeath extends ParseEvent {
	sourceID: string;
	sourceName: string;
	targetID: string;
	targetName: string;

	constructor(line: string) {
		super(line);
		this.ID = NetworkDeathID;

		this.targetID = this.rawValues[2];
		this.targetName = this.rawValues[3];
		this.sourceID = this.rawValues[4];
		this.sourceName = this.rawValues[5];
	}
}
