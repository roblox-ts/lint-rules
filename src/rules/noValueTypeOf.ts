import { makeRule } from "../util";

export const noValueTypeOfName = "no-value-typeof";
export const noValueTypeOf = makeRule<[], "typeofValueViolation">({
	name: "no-value-typeof",
	meta: {
		type: "problem",
		docs: {
			description: "Disallows the typeof operator for values",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		schema: [],
		messages: {
			typeofValueViolation:
				"'typeof' operator is not supported! Use `typeIs(value, type)` or `typeOf(value)` instead.",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			UnaryExpression(node) {
				if (node.operator === "typeof") {
					context.report({ node, messageId: "typeofValueViolation" });
				}
			},
		};
	},
});
