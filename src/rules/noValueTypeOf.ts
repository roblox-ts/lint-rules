import { makeRule } from "../util";

export const noValueTypeOf = makeRule<[], "typeofValueViolation">({
	name: "no-value-type-of",
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
				"The typeof operator is not supported for values. Please use `typeIs(value, typeName)` instead.",
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
