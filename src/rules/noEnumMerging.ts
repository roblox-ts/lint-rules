import { getParserServices, makeRule } from "../util/rules";

export const noEnumMergingName = "no-enum-merging";
export const noEnumMerging = makeRule<[], "enumMergingViolation">({
	name: noEnumMergingName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans enum declaration merging",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		messages: {
			enumMergingViolation: "Enum merging is not supported!",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		const checker = service.program.getTypeChecker();
		return {
			TSEnumDeclaration(node) {
				const tsNode = service.esTreeNodeToTSNodeMap.get(node);
				const symbol = checker.getSymbolAtLocation(tsNode.name);
				if (symbol && symbol.declarations.length > 1) {
					context.report({
						node: node.id,
						messageId: "enumMergingViolation",
					});
				}
			},
		};
	},
});
