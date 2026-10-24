import type { Api, BeaconApi } from "./Api.js";
import type { OnRequestSend } from "./OnRequestSend.js";
import type { OnResponseReceive } from "./OnResponseReceive.js";
import type { ApiResponse } from "./ApiResponse.js";
import { bunker, debunker } from "@digitak/bunker";
import { decodeStream } from "../utilities/decodeStream.js";
import { apiProxy } from "./apiProxy.js";
import { normalizePath } from "../utilities/normalizePath.js";
import type { ServicesRecord } from "../services/ServicesRecord.js";
import { getCacheKey } from "./getCacheKey.js";
import { gravityDB } from "./gravityDB.js";

type A = AsyncGenerator;

export type DefineApiOptions = {
	apiPath?: string;
	onRequestSend?: OnRequestSend;
	onResponseReceive?: OnResponseReceive;
};

export type CallApiOptions = {
	fetcher?: typeof fetch;
};

export type DefineApiResult<Services extends ServicesRecord<any>> = {
	api: Api<Services>;
	beacon: BeaconApi<Services>;
	callApi: (options: CallApiOptions) => Api<Services>;
	resolveApiCall: (
		options: CallApiOptions,
		service: string,
		target: string,
		properties: string[],
		body?: Uint8Array | null,
		key?: string,
	) => Promise<ApiResponse<unknown>>;
};

export function defineApi<Services extends ServicesRecord<any>>({
	apiPath = "/api",
	onRequestSend,
	onResponseReceive,
}: DefineApiOptions = {}): DefineApiResult<Services> {
	apiPath = normalizePath(apiPath);

	const resolveApiCall: DefineApiResult<Services>["resolveApiCall"] = async (
		{ fetcher = fetch },
		service,
		target,
		properties,
		body,
	) => {
		const headers = new Headers();
		headers.append("Content-Type", "application/bunker");
		if (body === undefined) {
			body = properties?.length ? bunker(properties) : null;
		}

		// define the base request object and pass it to the onRequestSend middleware
		let request: RequestInit = {
			method: "POST",
			headers,
			body: body == null ? body : new Uint8Array(body),
		};
		request = (await onRequestSend?.({ request })) ?? request;

		// fetch the server with the resulting request
		let response = await fetcher(`${apiPath}${service}/${target}`, request);

		// we receive a JSON object unless "application/bunker" content type is specified
		let data: any;

		const contentType = response.headers.get("Content-Type");

		if (contentType == "application/bunker") {
			data = debunker(new Uint8Array(await response.arrayBuffer()));
		} else if (contentType == "application/json") {
			data = (await response.json()) as unknown;
		} else if (contentType == "application/octet-stream") {
			const reader = response.body?.getReader();
			if (!reader) throw new Error("Streaming is not supported");
			data = (async function* () {
				do {
					const { done, value } = await reader.read();
					if (done) return;
					const results = decodeStream(value);
					for (const result of results) {
						yield result;
					}
				} while (true);
			})();
		} else {
			data = await response.json();
		}

		const result: ApiResponse = response.ok
			? { data }
			: { error: data as Error };

		await onResponseReceive?.({ response, ...result });

		return result;
	};

	const callApi = (options: CallApiOptions = {}) =>
		apiProxy<Api<Services>>((service, target, properties) =>
			resolveApiCall(options, service, target, properties),
		);

	const api = callApi();

	const beacon = apiProxy<BeaconApi<Services>>(
		(service, target, properties) => {
			const data = properties?.length ? new Uint8Array(bunker(properties)) : null;
			if (typeof navigator == "undefined")
				throw new Error(`Global variable navigator is undefined`);
			if (typeof navigator.sendBeacon == "undefined")
				throw new Error(`navigator.sendBeacon is undefined`);
			return navigator.sendBeacon(`${apiPath}${service}/${target}`, data);
		},
	);

	return { api, beacon, callApi, resolveApiCall };
}
