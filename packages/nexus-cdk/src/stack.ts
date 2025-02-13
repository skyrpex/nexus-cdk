import { Stack, type StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

// @__NO_SIDE_EFFECTS__
export const stack = <Props, Return>(
	handler: (stack: Stack, props: Props) => Return,
) => {
	return (scope: Construct, id: string, props: Props & StackProps): Return => {
		const stack = new Stack(scope, id, props);
		return handler(stack, props);
	};
};
