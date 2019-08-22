import { makeRule } from "../util";

export const noNull = makeRule<[], "nullViolation">({
	name: "no-null",
	meta: {
		type: "problem",
		docs: {
			description: "Bans null from being used",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false
		},
		fixable: "code",
		messages: {
			nullViolation: "Don't use null. Use undefined instead"
		},
		schema: []
	},
	defaultOptions: [],
	create(context) {
		return {
			TSNullKeyword(node) {
				context.report({
					node: node,
					messageId: "nullViolation",
					fix: fixer => fixer.replaceText(node, "undefined")
				});
			},

			Literal(node) {
				if (node.value === null)
					context.report({
						node: node,
						messageId: "nullViolation",
						fix: fixer => fixer.replaceText(node, "undefined")
					});
			}
		};
	}
});
