import { makeRule } from "../util";

export const noRegex = makeRule<[], "regexViolation">({
	name: "no-regex",
	meta: {
		type: "problem",
		docs: {
			description: "Disallows the regex operator",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false
		},
		schema: [],
		messages: {
			regexViolation: "Regex literals are not supported."
		}
	},
	defaultOptions: [],
	create(context) {
		const sourceCode = context.getSourceCode();
		return {
			Literal(node) {
				const token = sourceCode.getFirstToken(node);

				if (token && token.type === "RegularExpression") {
					context.report({
						node,
						messageId: "regexViolation"
					});
				}
			}
		};
	}
});
