import type { DefineHandlerOptions } from "./handler/DefineHandlerOptions.js";
import { resolveApiRequest } from "./handler/resolveApiRequest.js";
import { apiMatchesUrl } from "./utilities/apiMatchesUrl.js";
import { normalizeHandlerOptions } from "./handler/normalizeHandlerOptions.js";
import type { ServicesRecord } from "./services/ServicesRecord.js";
import type { GetContext } from "./services/GetContext.js";
import { parseHeaders } from "./utilities/parseHeaders.js";
import { getPathName } from "./utilities/getPathName.js";

export const defineHandler = <Services extends ServicesRecord<any>>(
	options: DefineHandlerOptions<
		GetContext<Services>,
		Services,
		Request,
		Response
	>,
) => {
	const { apiPath } = normalizeHandlerOptions(options);

	const handler = async (request: Request) => {
		const url = request.url ?? "";
		if (!apiMatchesUrl(apiPath, url)) return;
		const rawBody = new Uint8Array(await request.arrayBuffer());

		return await resolveApiRequest<GetContext<Services>, Request, Response>({
			request,
			method: request.method,
			url: getPathName(url).slice(apiPath.length),
			rawBody,
			allowedOrigins: options.allowedOrigins,
			allowedHeaders: options.allowedHeaders,
			allowedMethods: options.allowedMethods,
			exposedHeaders: options.exposedHeaders,
			maxAge: options.maxAge,
			allowedCredentials: options.allowedCredentials,
			services: options.services,
			schema: options.schema,
			headers: parseHeaders(request.headers),
			authorize: options.authorize,
			onRequestReceive: options.onRequestReceive,
			onResponseSend: options.onResponseSend,
			createResponse: ({ body, headers, status }) => {
				return new Response(body, {
					headers,
					status,
				});
			},
		});
	};

	return { handler };
};
