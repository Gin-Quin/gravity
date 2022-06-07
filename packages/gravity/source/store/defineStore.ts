import { apiProxy } from "../api/apiProxy.js";
import type { DefineApiOptions, DefineApiResult } from "../api/defineApi.js";
import { getCacheKey } from "../api/getCacheKey.js";
import { isBrowser } from "../utilities/isBrowser.js";
import type { StoreData } from "./StoreData.js";
import type { FetchOptions } from "./FetchOptions.js";
import type { ApiResponse } from "../index.js";
import { defineApi } from "../api.js";
import { bunker } from "@digitak/bunker";
import type { ServicesRecord } from "../services/ServicesRecord.js";
import { gravityDB } from "../api/gravityDB.js";

export type DefineStoreInterface<Store> = {
	createStore: (fetcher: () => AsyncGenerator<ApiResponse<unknown>>) => Store;
	storeCache: Map<string, Store>;
	getStoreData: (store: Store) => StoreData<unknown>;
	unwrapStore?: (store: Store) => any;
	refreshOnStoreRequest?: boolean;
};

export type DefineStoreOptions = DefineApiOptions & FetchOptions;

export type DefineStoreResult<
	Services extends ServicesRecord<any>,
	StoreProxy,
> = DefineApiResult<Services> & {
	store: StoreProxy;
	useStore: (options?: FetchOptions) => StoreProxy;
};

export function defineStore<Store>(
	options: DefineStoreOptions,
	{
		storeCache,
		refreshOnStoreRequest,
		createStore,
		getStoreData,
		unwrapStore = (store) => store,
	}: DefineStoreInterface<Store>,
) {
	const api = defineApi(options);
	const { resolveApiCall } = api;

	const useStore = ({
		cache = options.cache ?? true,
		network = options.network ?? true,
		interval = options.interval,
		persist = options.persist,
		fetcher: customFetcher = options.fetcher,
	}: FetchOptions = {}) =>
		apiProxy((service, operation, properties) => {
			if (!isBrowser()) {
				const store = createStore(async function* () {
					// on non-browser, return a promise that never resolves
					return new Promise(() => {});
				});
				return unwrapStore(store);
			}

			const body: null | Uint8Array = properties?.length
				? bunker(properties)
				: null;
			const key = getCacheKey(service, operation, body);

			const fetcher = async function* (): AsyncGenerator<ApiResponse<unknown>> {
				if (persist) {
					const data = await gravityDB.get(key);
					if (!network) {
						yield { data };
						return;
					}
					if (data !== undefined) {
						yield { data };
						if (network == "if-needed") return;
					}
				}

				const response = await resolveApiCall(
					{ fetcher: customFetcher },
					service,
					operation,
					properties,
					body,
				);

				if (!response.error && persist) {
					await gravityDB.set(key, response.data);
				}

				yield response;
				return;
			};

			let store: Store;
			let cached = (cache === true || cache == "read") && storeCache.get(key);

			if (cached) store = cached;
			else {
				store = createStore(fetcher);
				if (cache === true || cache == "write") {
					storeCache.set(key, store);
				}
			}

			console.log("cached", cached);
			console.log("network", network, network && !cached);
			if ((network && !cached) || (refreshOnStoreRequest && network === true)) {
				const { lastRefreshAt, refresh } = getStoreData(store);
				const shouldRefresh =
					!lastRefreshAt || !interval || lastRefreshAt + interval < Date.now();
				console.log("shouldRefresh", shouldRefresh);
				if (shouldRefresh) refresh();
			}

			return unwrapStore(store);
		});

	const store = useStore();
	return { ...api, store, useStore };
}
