import os from "os";
import fs from "fs";
import path from "path";
import { Tail } from "tail";

import config from "../config";
import {
	DELIMITER,
	ParseEvent,
	NetworkAbility,
	NetworkAbilityID,
	NetworkAOEAbilityID,
	ChangePrimaryPlayerID,
	ChangePrimaryPlayer,
	CustomInCombatID,
	CustomOutOfCombatID,
	CustomOffCooldownID,
	CustomOffCooldown,
	CustomOnCooldownID,
	CustomOnCooldown,
} from "./events";
import { Hook, HookManager } from "../hooks";
import { appWhenReady } from "../../driver";

interface State {
	primaryPlayer: string;
	primaryPlayerID: string;
	inCombat: boolean;
	lastInCombat: Date;
}

export interface ParserOptions {
	defaultPrimaryPlayer?: string;
}

export class Parser {
	refreshPollRateMs = 60000;
	currentTailDir: string | null = null;
	currentTailFile: string | null = null;
	currentTail: Tail | null = null;
	started = false;
	hooks: HookManager<ParseEvent>;
	state: State;
	outOfCombatTimeS = 20;

	constructor(opts: ParserOptions) {
		this.currentTailDir = path.join(
			os.homedir(),
			config.DEFAULT_ACT_LOG_DIR,
		);
		this.hooks = new HookManager();
		this.state = {
			primaryPlayer: opts.defaultPrimaryPlayer ?? "",
			primaryPlayerID: "",
			inCombat: false,
			lastInCombat: new Date(),
		};

		this.setupCustomEvents();
	}

	async start(): Promise<void> {
		if (this.started) {
			throw new Error("already started");
		}
		if (this.currentTailDir === null) {
			throw new Error("current tail directory is empty");
		}

		try {
			this.started = true;
			await this.refresh();
		} catch (err) {
			this.started = false;
			throw new Error(`failed refreshing tail directory: ${err}`);
		}
	}

	stop() {
		this.started = false;
		this.currentTail?.unwatch();
	}

	async refresh(): Promise<string> {
		if (this.currentTailDir === null) {
			throw new Error("current tail directory is empty");
		}
		const latest = await getLatestFiles(this.currentTailDir);
		if (latest === "") {
			throw new Error(`no files found in ${this.currentTailDir}`);
		}

		const latestFile = path.join(this.currentTailDir, latest);

		if (this.currentTailFile === latestFile) {
			setTimeout(async () => {
				if (this.started) {
					console.log("Refreshing tailed file...");
					this.refresh();
				}
			}, this.refreshPollRateMs);
			return latestFile;
		}

		if (!(this.currentTail === null)) {
			this.currentTail.unwatch();
		}

		this.currentTailFile = latestFile;
		this.currentTail = new Tail(latestFile, {
			useWatchFile: true,
			fsWatchOptions: {
				interval: 10,
			},
		});

		return new Promise((res, rej) => {
			if (this.currentTail === null) {
				rej("current tail is unexpectedly null");
				return;
			}
			this.currentTail.on("error", (err: Error) => {
				rej(`failed to tail file: ${err}`);
			});

			this.currentTail.on("line", (line: string) => {
				const event = this.parse(line);
				try {
					this.hooks.run(event.ID, event);
				} catch (err) {
					console.error(
						`failed running hook with ID ${event.ID}: ${err}`,
					);
				}
			});

			this.currentTail.watch();

			console.log(`Tailing new file: ${latestFile}`);
			this.started = true;

			setTimeout(async () => {
				if (this.started) {
					console.log("Refreshing tailed file...");
					this.refresh();
				}
			}, this.refreshPollRateMs);

			res(latest);
		});
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

	setInCombat(inCombat: boolean) {
		this.state.inCombat = inCombat;
	}

	getInCombat(): boolean {
		return this.state.inCombat;
	}
	getLastInCombat(): Date {
		return this.state.lastInCombat;
	}

	setupCustomEvents() {
		setInterval(() => {
			if (!this.getInCombat()) {
				return;
			}
			const outOfCombatSec =
				new Date().getTime() - this.getLastInCombat().getTime();
			if (outOfCombatSec > this.outOfCombatTimeS * 1000) {
				const newEvent = new ParseEvent("");
				newEvent.ID = CustomOutOfCombatID;
				this.hooks.run(CustomOutOfCombatID, newEvent);
				this.state.inCombat = false;
			}
		}, 200);

		const inCombatHook: Hook<ParseEvent> = (e) => {
			if (!(e instanceof NetworkAbility)) {
				return;
			}

			if (
				e.ability.toLowerCase() === "attack" &&
				((this.state.primaryPlayerID !== "" &&
					e.source.ID === this.state.primaryPlayerID) ||
					e.target.ID === this.state.primaryPlayerID ||
					(this.state.primaryPlayerID === "" &&
						e.source.name === this.state.primaryPlayer) ||
					e.target.name === this.state.primaryPlayer)
			) {
				appWhenReady().then(() => {
					this.state.lastInCombat = new Date();
					if (this.getInCombat()) {
						return;
					}

					this.state.inCombat = true;
					const newEvent = new ParseEvent("");
					newEvent.ID = CustomInCombatID;
					this.hooks.run(CustomInCombatID, newEvent);
				});
			}
		};
		const cooldownsHook: Hook<ParseEvent> = (e) => {
			if (!(e instanceof NetworkAbility)) {
				return;
			}

			if (
				(this.state.primaryPlayerID !== "" &&
					e.source.ID === this.state.primaryPlayerID) ||
				(this.state.primaryPlayerID === "" &&
					e.source.name === this.state.primaryPlayer &&
					config.abilities[e.ability] &&
					config.abilities[e.ability].cooldown > 1)
			) {
				this.hooks.run(
					CustomOnCooldownID,
					new CustomOnCooldown(config.abilities[e.ability]),
				);

				setTimeout(() => {
					this.hooks.run(
						CustomOffCooldownID,
						new CustomOffCooldown(
							e.timestamp,
							config.abilities[e.ability],
						),
					);
				}, 1000 * (config.abilities[e.ability].cooldown - config.bufferLeniency));
			}
		};

		this.hooks.attach(NetworkAbilityID, inCombatHook);
		this.hooks.attach(NetworkAOEAbilityID, inCombatHook);

		this.hooks.attach(NetworkAbilityID, cooldownsHook);
		this.hooks.attach(NetworkAOEAbilityID, cooldownsHook);

		this.hooks.attach(ChangePrimaryPlayerID, (e) => {
			if (!(e instanceof ChangePrimaryPlayer)) {
				return;
			}

			this.state.primaryPlayerID = e.playerID;
			this.state.primaryPlayer = e.playerName;
		});
	}
}

function getLatestFiles(dir: string): Promise<string> {
	return new Promise((res, rej) => {
		fs.readdir(dir, function (err, files) {
			if (err) {
				rej(err);
			}

			let latestFile = "";
			let latestFileStats: fs.Stats;

			files.forEach((file) => {
				const fileStat = fs.statSync(path.join(dir, file));
				if (
					!latestFileStats ||
					fileStat.mtime > latestFileStats.mtime
				) {
					latestFileStats = fileStat;
					latestFile = file;
				}
			});

			res(latestFile);
		});
	});
}
