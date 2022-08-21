export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface Vec2 {
	x: number;
	y: number;
}

export function multiplyVec2({ x, y }: Vec2, factor: number): Vec2 {
	return {
		x: x * factor,
		y: y * factor,
	};
}
