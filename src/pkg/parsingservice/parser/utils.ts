import { Vec3 } from "../../ui/maths";
import { Directional, Entity } from "./events";

export function calculateDirectional(
	source: Entity,
	target: Entity,
): Directional | null {
	if (source.ID === "" || target.ID === "") {
		return null;
	}

	const s1: Vec3 = {
		x: source.position.x - target.position.x,
		y: source.position.y - target.position.y,
		z: source.position.z,
	};

	const rotationAngle = -target.heading;

	const s2: Vec3 = {
		x: Math.cos(rotationAngle) * s1.x + Math.sin(rotationAngle) * s1.y,
		y: -Math.sin(rotationAngle) * s1.x + Math.cos(rotationAngle) * s1.y,
		z: source.position.z,
	};

	if (s2.y >= 0 && Math.abs(s2.x) <= s2.y) {
		return Directional.Front;
	} else if (s2.y <= 0 && Math.abs(s2.x) <= -s2.y) {
		return Directional.Rear;
	} else if (s2.x >= 0 && Math.abs(s2.y) <= s2.x) {
		return Directional.FlankLeft;
	} else if (s2.x <= 0 && Math.abs(s2.y) <= -s2.x) {
		return Directional.FlankRight;
	}

	return null;
}
