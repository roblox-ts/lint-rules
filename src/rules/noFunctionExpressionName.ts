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
			functionExpressionIdViolation: "Function expression names are not supported!",
		},
		schema: [],
		fixable: "code",
	},
	defaultOptions: [],
	create(context) {
		return {
			FunctionExpression(node) {
				if (node.id) {
					context.report({
						node: node.id,
						messageId: "functionExpressionIdViolation",
						fix: (fix) => node.id && fix.removeRange(node.id.range),
					});
				}
			},
		};
	},
});
