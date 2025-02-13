import { Construct } from "constructs";

// @__NO_SIDE_EFFECTS__
export const construct = <Props, Return>(
	handler: (scope: Construct, props: Props) => Return,
) => {
	return (scope: Construct, id: string, props: Props): Return => {
		const construct = new Construct(scope, id);
		return handler(construct, props);
	};
};
