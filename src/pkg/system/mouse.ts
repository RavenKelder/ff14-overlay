import { Point, mouse } from "@nut-tree/nut-js";
import { Vec2 } from "../maths";

let lastSendMouseTo = new Date(0);
export function sendMouseTo(point: Vec2, throttle = 500) {
	const currentSendMouseTo = new Date();
	if (currentSendMouseTo.getTime() - lastSendMouseTo.getTime() < throttle) {
		return;
	}

	const centre = new Point(point.x, point.y);
	mouse.setPosition(centre);
	lastSendMouseTo = currentSendMouseTo;
}
