import { validateSignature } from "typezer/validate";
import { findTargetInSchema } from "typezer/types/Type/findPathTarget";
import type { BaseServiceConstructor } from "../services/BaseServiceConstructor.js";
import type { GravityResponse } from "./GravityResponse.js";
import type { Type } from "typezer";
import type { Authorize } from "./Authorize.js";
import type { OnRequestReceive } from "./OnRequestReceive.js";
import type { IncomingHttpHeaders } from "http";
import { bunker } from "@digitak/bunker";
import { gravityError, isGravityError } from "../errors/GravityError.js";
import { decodeParameters } from "../utilities/decodeParameters.js";
import { decodeUrl } from "../utilities/decodeUrl.js";
import { resolvePath } from "./resolvePath.js";
import { getAllowedOrigin } from "../utilities/getAllowedOrigin.js";
import { logger } from "../logs/logger.js";
import { parseCookies } from "../cookie/parseCookies.js";
import type { OnResponseSend } from "./OnResponseSend.js";
import type { ApiResponse } from "../index.js";
import type { SetContentType } from "./SetContentType.js";
import { getContentType } from "../metadata/ContentType.js";

export type ResolveApiRequestOptions<Context, Request, Response> = {
	request: Request;
	method: string | undefined;
	url: string;
	services: Record<string, BaseServiceConstructor>;

	/**
	 * The schema used to validate the request arguments.
	 * Set it to "schemaless" to disable the schema validation.
	 */
	schema?: Record<string, Record<string, Type>>;
	headers: IncomingHttpHeaders;
	rawBody: Uint8Array | null | undefined;
	allowedOrigins: string[] | undefined;
	allowedHeaders: string[] | undefined;
	allowedMethods: string[] | undefined;
	exposedHeaders: string[] | undefined;
	maxAge: number | undefined;
	allowedCredentials: boolean | undefined;
	authorize: Authorize<Context> | undefined;
	onRequestReceive: OnRequestReceive<Context, Request> | undefined;
	setContentType?: SetContentType<Context, Request> | undefined;
	onResponseSend: OnResponseSend<Context, Response> | undefined;
	createResponse: (options: GravityResponse) => Response;
	writeResponse?: (response: Response, body: Uint8Array | string) => void;
};

export async function resolveApiRequest<Context, Request, Response>(
	options: ResolveApiRequestOptions<Context, Request, Response>,
): Promise<Response> {
	let contentType =
		options.headers["content-type"] == "application/bunker"
			? "application/bunker"
			: "application/json";
	const allowedOrigin = getAllowedOrigin(
		options.headers.origin,
		options.allowedOrigins,
	);
	const { request } = options;
	const GRAVITY_SCHEMALESS =
		globalThis.process?.env?.GRAVITY_SCHEMALESS ??
		import.meta?.env?.GRAVITY_SCHEMALESS;

	if (GRAVITY_SCHEMALESS === "true" || GRAVITY_SCHEMALESS === "") {
		options.schema = undefined;
	}

	let status = 200;
	let resolved: unknown;
	let headers: IncomingHttpHeaders = {};
	let body: any = "";
	let apiResponse: ApiResponse;

	// setting response headers
	headers["access-control-allow-headers"] = "*";
	if (allowedOrigin != null) {
		headers["access-control-allow-origin"] = allowedOrigin;
	}
	headers["access-control-allow-headers"] =
		options.allowedHeaders?.join(", ") ?? "*";

	if (options.allowedMethods) {
		headers["access-control-allow-methods"] = options.allowedMethods.join(", ");
	}
	if (options.exposedHeaders) {
		headers["access-control-expose-headers"] =
			options.exposedHeaders.join(", ");
	}
	if (options.maxAge) {
		headers["access-control-max-age"] = String(options.maxAge);
	}
	if (options.allowedCredentials) {
		headers["access-control-allow-credentials"] = "true";
	}

	// if case of an "OPTIONS" request, we just return the headers
	// so that the browser can check if the POST request is
	// allowed or not
	if (options.method == "OPTIONS") {
		return options.createResponse({ status, headers, body });
	}

	const cookies = parseCookies(options.headers.cookie ?? "");

	const [serviceName, ...path] = decodeUrl(options.url);

	const serviceConstructor = options.services[serviceName];
	if (!serviceConstructor) {
		throw gravityError({
			message: "Service inexistant",
			serviceName,
			status: 404,
		});
	}
	if (options.schema && !options.schema[serviceName]) {
		throw gravityError({
			message: "Schema is not in sync with services",
			status: 500,
		});
	}

	const context = await options.onRequestReceive?.({
		request,
		cookies,
		service: serviceConstructor,
		path,
	})!;

	try {
		if (!serviceName) {
			throw gravityError({
				message: "Service missing",
				serviceName,
				status: 400,
			});
		}

		if (!path.length) {
			throw gravityError({
				message: "Target missing",
				serviceName,
				status: 400,
			});
		}

		// we authorize the call
		await options.authorize?.({
			context,
			service: serviceConstructor,
			path,
		});

		// get the content type from the @ContentType() decorator
		const customContentType = getContentType(serviceConstructor, path[0]);
		if (customContentType) {
			contentType = customContentType;
		}

		// get the content type from the setContentType function
		if (options.setContentType) {
			contentType = await options.setContentType({
				context,
				request,
				cookies,
				service: serviceConstructor,
				path,
			});
		}

		const service = new serviceConstructor(context);

		// we check the path exists in schema
		if (options.schema) {
			const targetType = findTargetInSchema(options.schema[serviceName], path);
			if (!targetType) {
				throw gravityError({
					message: "Target inexistant",
					serviceName,
					target: path.join("/"),
					status: 404,
				});
			}
		}

		// then we retrieve the target
		const target = resolvePath(serviceName, service, path);

		if (typeof target == "function") {
			const parameters = decodeParameters(options.headers, options.rawBody);
			let errors: Array<string> | undefined;

			if (options.schema) {
				try {
					errors = validateSignature(
						options.schema[serviceName],
						path,
						parameters,
					).errors;
				} catch (error) {
					throw gravityError({
						message: "Target inexistant",
						serviceName,
						target: path.join("/"),
						status: 404,
					});
				}

				if (errors?.length) {
					throw gravityError({
						message: "Bad parameters",
						errors,
						serviceName,
						target: path.join("/"),
						status: 400,
					});
				}
			}

			resolved = await target.apply(service, parameters);
		} else {
			resolved = await target;
		}
		apiResponse = { data: resolved };
	} catch (error) {
		if (error instanceof Error) {
			if (isGravityError(error)) {
				status = error.status ?? 500;
				logger.warning(error.name, error.message, error.stack);
				console.warn(error);
			} else {
				status = 500;
				logger.error(error.name, error.message, error.stack);
				console.error(error);
			}
			const { name, message } = error;
			resolved = { ...error, name, message };
			apiResponse = { error };
		} else {
			const errorStatus = (error as any)?.status;
			status = typeof errorStatus == "number" ? errorStatus : 500;
			resolved = {
				name: "UnknownError",
				detail: error,
			};
			apiResponse = { error: Object.assign(new Error(), resolved) };
		}
	}

	if (resolved instanceof ReadableStream) {
		if (
			contentType == "application/json" ||
			contentType == "application/bunker"
		) {
			contentType = "application/octet-stream";
		}
	}

	// depending on the content type, we return the right body
	headers["content-type"] = contentType;

	switch (contentType) {
		case "application/bunker":
			body = bunker(resolved);
			headers["content-length"] = String(body.length);
			break;
		case "application/json":
			body = JSON.stringify(resolved);
			headers["content-length"] = String(new TextEncoder().encode(body).length);
			break;
		case "application/octet-stream":
			// streaming ReadableStream response
			body = resolved;
			break;
		default:
			body = resolved;
		// we have to trust the user to return the right body type
	}

	// we create and write the response object
	let response = options.createResponse({ status, headers, body });
	response =
		(await options.onResponseSend?.({ context, response, ...apiResponse })) ??
		response;

	if (
		contentType == "application/bunker" ||
		contentType == "application/json"
	) {
		options.writeResponse?.(response, body);
	}

	return response;
}
