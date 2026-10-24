import { expect, test } from "bun:test";
import { bunker, debunker } from "@digitak/bunker";
import { decodeStream } from "../source/utilities/decodeStream";

test("binary serialization preserves complex RPC values", () => {
	const value = {
		date: new Date("2026-10-24T00:00:00Z"),
		map: new Map([["key", 42]]), set: new Set([1, 2]),
		bytes: new Uint8Array([0, 1, 255]), big: 2n ** 64n,
		text: "large text 🪐".repeat(20000),
	};
	expect(debunker(bunker(value))).toEqual(value);
	const recursive: { self?: unknown } = {};
	recursive.self = recursive;
	const decoded = debunker(bunker(recursive)) as typeof recursive;
	expect(decoded.self).toBe(decoded);
});

test("streaming chunks decode concatenated values without a script runner dependency", () => {
	const values = [7, "hello", new Date("2026-10-24"), { nested: [1, 2, 3] }];
	const parts = values.map((value) => bunker(value));
	const data = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
	let offset = 0;
	for (const part of parts) { data.set(part, offset); offset += part.length; }
	expect(decodeStream(data)).toEqual(values);
	expect(decodeStream(new Uint8Array())).toEqual([]);
});
