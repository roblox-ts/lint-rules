import { makeRule } from "../util";

export const noDeleteName = "no-delete";
export const noDelete = makeRule<[], "deleteViolation">({
	name: noDeleteName,
	meta: {
		type: "problem",
		docs: {
			description: "Disallows the delete operator",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		schema: [],
		messages: {
			deleteViolation: "The delete operator is not supported. Please use a map instead and use map.delete()",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			UnaryExpression(node) {
				if (node.operator === "delete") {
					context.report({ node, messageId: "deleteViolation" });
				}
			},
		};
	},
});
