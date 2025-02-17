import { Construct } from "constructs";

import { Service } from "@nexus-cdk/service";

import type { IVite, ViteProps } from "./vite.types.ts";

import { viteProcedure } from "./vite.procedures.ts";

export class Vite extends Construct implements IVite {
	readonly url: string;
	constructor(scope: Construct, id: string, props: ViteProps) {
		super(scope, id);

		const vite = new Service(this, "Service", {
			context: {
				define: props.define,
				environment: props.environment,
				proxy: props.proxy,
				root: props.root,
			},
			procedure: viteProcedure,
		});

		this.url = vite.outputs.url;
	}
}
