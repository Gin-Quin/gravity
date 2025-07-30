import type { IncomingMessage, ServerResponse } from "http";
import type { DefineHandlerOptions } from "./handler/DefineHandlerOptions.js";
import { extractRawBody } from "./utilities/extractRawBody.js";
import { resolveApiRequest } from "./handler/resolveApiRequest.js";
import { apiMatchesUrl } from "./utilities/apiMatchesUrl.js";
import { normalizeHandlerOptions } from "./handler/normalizeHandlerOptions.js";
import type { ServicesRecord } from "./services/ServicesRecord.js";
import type { GetContext } from "./services/GetContext.js";
import { getPathName } from "./utilities/getPathName.js";

export const defineHandler = <Services extends ServicesRecord<any>>(
	options: DefineHandlerOptions<
		GetContext<Services>,
		Services,
		IncomingMessage,
		ServerResponse
	>,
) => {
	const { apiPath } = normalizeHandlerOptions(options);

	const handler = async (
		request: IncomingMessage,
		response: ServerResponse,
		next?: Function,
	) => {
		const url = request.url ?? "";
		if (!apiMatchesUrl(apiPath, url)) return next?.();
		const rawBody = await extractRawBody(request);

		await resolveApiRequest<
			GetContext<Services>,
			IncomingMessage,
			ServerResponse
		>({
			request,
			method: request.method,
			url: getPathName(url).slice(apiPath.length),
			rawBody,
			allowedOrigins: options.allowedOrigins,
			services: options.services,
			schema: options.schema,
			headers: request.headers,
			allowedCredentials: options.allowedCredentials,
			allowedHeaders: options.allowedHeaders,
			allowedMethods: options.allowedMethods,
			exposedHeaders: options.exposedHeaders,
			maxAge: options.maxAge,
			authorize: options.authorize,
			onRequestReceive: options.onRequestReceive,
			onResponseSend: options.onResponseSend,
			createResponse: ({ headers, status }) => {
				response.statusCode = status;
				for (const header in headers) {
					response.setHeader(header, headers[header]);
				}
				return response;
			},
			writeResponse: (response, body) => body && response.write(body),
		});

		return response.end();
	};

	return { handler };
};
