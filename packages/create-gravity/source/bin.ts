#!/usr/bin/env bun
import sade from "sade";
import { useCreate, useVersion } from "@digitak/gravity/cli/commands";

const program = sade("create-gravity", true);

useVersion(program);
useCreate(program, "");

program.parse(process.argv);
