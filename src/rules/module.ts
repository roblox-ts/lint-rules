import { makeRule, getParserServices } from "../util/rules";
import ts from "typescript";

export const moduleName = "module";
export const module = makeRule<[], "moduleViolation">({
	name: moduleName,
	meta: {
		type: "problem",
		docs: {
			description: "Enforces file is a module",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		fixable: "code",
		messages: {
			moduleViolation: "File must contain at least one import or export statement to be a module.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		return {
			Program(node) {
				const tsNode = service.esTreeNodeToTSNodeMap.get(node);
				if (tsNode.externalModuleIndicator === undefined) {
					context.report({
						node: node.body[0],
						messageId: "moduleViolation",
						fix: (fixer) => fixer.insertTextBefore(node, "export {};\n"),
					});
				}
			},
		};
	},
});
