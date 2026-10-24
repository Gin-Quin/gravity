#!/usr/bin/env bun
import sade from "sade";
import {
	useBuild,
	useCreate,
	useDevelop,
	useGenerateSchema,
	usePreview,
	useVersion,
} from "./commands.js";

const program = sade("gravity");

useVersion(program);
useCreate(program);
useDevelop(program);
useBuild(program);
useGenerateSchema(program);
usePreview(program);

program.parse(process.argv);
