import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * A schema error with useful information.
 **/
export class StandardSchemaV1Error extends Error {
	/** The schema issues. */
	public readonly issues: readonly StandardSchemaV1.Issue[];

	/**
	 * Creates a schema error with useful information.
	 *
	 * @param issues The schema issues.
	 */
	constructor(issues: readonly StandardSchemaV1.Issue[]) {
		super(issues[0]?.message);
		this.name = "SchemaError";
		this.issues = issues;
	}
}
