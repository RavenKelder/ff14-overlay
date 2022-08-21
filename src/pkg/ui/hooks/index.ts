import { v4 as uuidv4 } from "uuid";

export type Hook<T> = (event: T) => void;

export class HookManager<T> {
	hooks: Record<string, Record<string, Hook<T>>>;
	globalHooks: Record<string, Hook<T>>;
	constructor() {
		this.hooks = {};
		this.globalHooks = {};
	}

	attach(eventID: string, hook: Hook<T>): string {
		const newID = uuidv4();

		if (Object.prototype.hasOwnProperty.call(this.hooks, eventID)) {
			this.hooks[eventID][newID] = hook;
		} else {
			this.hooks[eventID] = {
				[newID]: hook,
			};
		}

		return newID;
	}

	attachGlobal(hook: Hook<T>): string {
		const newID = uuidv4();
		this.globalHooks[newID] = hook;
		return newID;
	}

	detach(eventID: string, attachID: string): boolean {
		if (Object.prototype.hasOwnProperty.call(this.hooks, eventID)) {
			if (
				Object.prototype.hasOwnProperty.call(
					this.hooks[eventID],
					attachID,
				)
			) {
				delete this.hooks[eventID][attachID];
				return true;
			}
		}

		return false;
	}

	detachGlobal(attachID: string): boolean {
		if (Object.prototype.hasOwnProperty.call(this.globalHooks, attachID)) {
			delete this.globalHooks[attachID];
			return true;
		}

		return false;
	}

	run(eventID: string, t: T) {
		for (const attachID in this.globalHooks) {
			this.globalHooks[attachID](t);
		}
		if (Object.prototype.hasOwnProperty.call(this.hooks, eventID)) {
			for (const attachID in this.hooks[eventID]) {
				this.hooks[eventID][attachID](t);
			}
		}
	}
}
