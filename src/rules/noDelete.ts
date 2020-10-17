import { makeRule } from "../util/rules";

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
			deleteViolation:
				"The delete operator is not supported. Setting the property to `undefined` has the same behaviour.",
		},
		fixable: "code",
	},
	defaultOptions: [],
	create(context) {
		return {
			UnaryExpression(node) {
				if (node.operator === "delete") {
					context.report({
						node,
						messageId: "deleteViolation",
						fix: fix => {
							return [
								fix.insertTextAfter(node, " = undefined"),
								// seven characters: "delete "
								fix.removeRange([node.range[0], node.argument.range[0]]),
							];
						},
					});
				}
			},
		};
	},
});
