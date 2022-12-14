const keyMap: Record<string, number> = {
	F1: 112,
	F2: 113,
	F3: 114,
	F4: 115,
	F5: 116,
	F6: 117,
	F7: 118,
	F8: 119,
	F9: 120,
	F10: 121,
	F11: 122,
	F12: 123,
};

export function mapKeyToInt(key: string): number {
	return keyMap[key] ?? 0;
}
