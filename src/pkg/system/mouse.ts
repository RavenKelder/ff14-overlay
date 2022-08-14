import { Point, mouse } from "@nut-tree/nut-js";
import { Vec2 } from "../maths";

export function sendMouseTo(point: Vec2) {
	const centre = new Point(point.x, point.y);
	mouse.setPosition(centre);
}
