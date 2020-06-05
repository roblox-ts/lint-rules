import { makeRule } from "../util/rules";

export const noFunctionExpressionIdName = "no-function-expression-id";
export const noFunctionExpressionId = makeRule<[], "functionExpressionIdViolation">({
	name: noFunctionExpressionIdName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans function expression names",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		messages: {
			functionExpressionIdViolation: "Function expression ids are not supported!",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			FunctionExpression(node) {
				if (node.id) {
					context.report({
						node: node.id,
						messageId: "functionExpressionIdViolation",
					});
				}
			},
		};
	},
});
