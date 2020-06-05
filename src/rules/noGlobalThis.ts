import { makeRule } from "../util/rules";

export const noGlobalThisName = "no-global-this";
export const noGlobalThis = makeRule<[], "globalThisViolation">({
	name: noGlobalThisName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans null from being used",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		messages: {
			globalThisViolation: "`globalThis` is not supported!",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			Identifier(node) {
				if (node.name === "globalThis") {
					context.report({
						node: node,
						messageId: "globalThisViolation",
					});
				}
			},
		};
	},
});
