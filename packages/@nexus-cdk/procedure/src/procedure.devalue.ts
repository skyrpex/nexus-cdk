/* eslint-disable @typescript-eslint/no-explicit-any */
import * as devalueCodec from "devalue-codec";

import type { Assume, HKT } from "./hkt.ts";

import { createBuilder } from "./procedure.ts";

interface DevalueSerializableHKT extends HKT {
	apply: (value: Assume<this["_1"], any>) => devalueCodec.Check<typeof value>;
}

export const procedure = createBuilder<DevalueSerializableHKT>();
