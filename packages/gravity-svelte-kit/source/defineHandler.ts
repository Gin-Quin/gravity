import type { DefineHandlerOptions } from "@digitak/gravity/handler/DefineHandlerOptions";
import type { Handle } from "@sveltejs/kit";
import type { GetContext } from "@digitak/gravity/services/GetContext";
import { normalizeHandlerOptions } from "@digitak/gravity/handler/normalizeHandlerOptions";
import { resolveApiRequest } from "@digitak/gravity/handler/resolveApiRequest";
import type { ServicesRecord } from "@digitak/gravity";
import { apiMatchesUrl } from "@digitak/gravity/utilities/apiMatchesUrl";
import { parseHeaders } from "@digitak/gravity/utilities/parseHeaders";

export const defineHandler = <Services extends ServicesRecord<any>>(
	options: DefineHandlerOptions<
		GetContext<Services>,
		Services,
		Request,
		Response
	>,
) => {
	const { apiPath } = normalizeHandlerOptions(options);

	const resolve = async (event: any) => {
		const { url, request } = event;
		const { pathname } = url;
		const rawBody = new Uint8Array(await request.arrayBuffer());

		return await resolveApiRequest<GetContext<Services>, Request, Response>({
			request,
			method: request.method,
			url: pathname.slice(apiPath.length),
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
			createResponse: ({ body, headers, status }) =>
				new Response(body, {
					headers,
					status,
				}),
		});
	};

	const handle = <Handle>(async ({ event, resolve: baseResolve }) => {
		if (!apiMatchesUrl(apiPath, event.url.pathname)) return baseResolve(event);
		return resolve(event);
	});

	return { handle };
};
