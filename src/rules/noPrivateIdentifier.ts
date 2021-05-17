import ts, { isPrivateIdentifier } from "typescript";
import { getParserServices, makeRule } from "../util/rules";

export const noPrivateIdentifierName = "no-private-identifier";
export const noPrivateIdentifier = makeRule<[], "privateIdentifierViolation">({
	name: noPrivateIdentifierName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans private identifiers from being used",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		messages: {
			privateIdentifierViolation: "Private identifiers are not supported!",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		return {
			ClassProperty(node) {
				const tsNode = service.esTreeNodeToTSNodeMap.get(node.key);
				if (isPrivateIdentifier(tsNode)) {
					context.report({
						node: node,
						messageId: "privateIdentifierViolation",
					});
				}
			},
		};
	},
});
