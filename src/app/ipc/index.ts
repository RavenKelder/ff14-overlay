export enum Channel {
	OK = "ok",
	StartOK = "start-ok",
	StartOptions = "start-options",
	MenuOpen = "menu-open",
	MenuClose = "menu-close",
	FileReceive = "file-receive",
	FileRequest = "file-request",
	SegmentSelect = "segment-select",
	SegmentCooldown = "segment-cooldown",
	SegmentHover = "segment-hover",
	Combat = "combat",
	AbilityChargesRequest = "ability-charges-request",
	AbilityChargesReceive = "ability-charges-receive",
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
