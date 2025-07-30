import type { Authorize } from "./Authorize.js";
import type { OnRequestReceive } from "./OnRequestReceive.js";
import type { OnResponseSend } from "./OnResponseSend.js";
import type { ServicesRecord } from "../services/ServicesRecord.js";

export type DefineHandlerOptions<
	Context,
	Services extends ServicesRecord<Context>,
	Request,
	Response,
> = {
	services: Services;
	schema?: Record<string, any>;
	apiPath?: string;
	verbose?: boolean;
	onResponseSend?: OnResponseSend<Context, Response>;
	authorize?: Authorize<Context>;
	allowedOrigins?: string[];
	allowedHeaders?: string[];
	allowedMethods?: string[];
	exposedHeaders?: string[];
	maxAge?: number;
	allowedCredentials?: boolean;
} & (Context extends undefined
	? { onRequestReceive?: OnRequestReceive<Context, Request> }
	: {
			onRequestReceive: OnRequestReceive<Context, Request>;
		});
