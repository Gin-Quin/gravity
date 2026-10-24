import BufferDecoder from "@digitak/bunker/decode/BufferDecoder";

/** Decode independently encoded values concatenated in a streaming chunk. */
export function decodeStream(data: Uint8Array): unknown[] {
	const values: unknown[] = [];
	let cursor = 0;
	while (cursor < data.length) {
		const decoder = new BufferDecoder(data, cursor);
		values.push(decoder.any());
		cursor = decoder.cursor;
	}
	return values;
}
