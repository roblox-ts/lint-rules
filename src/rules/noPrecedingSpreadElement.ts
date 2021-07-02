import ts from "typescript";
import { getParserServices, makeRule } from "../util/rules";

export const noPrecedingSpreadElementName = "no-preceding-spread-element";
export const noPrecedingSpreadElement = makeRule<[], "noPrecedingSpreadElementViolation">({
	name: noPrecedingSpreadElementName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans spread elements not last in a list of arguments from being used",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		schema: [],
		messages: {
			noPrecedingSpreadElementViolation: "Spread element must come last in a list of arguments!",
		},
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		return {
			SpreadElement(node) {
				const tsNode = service.esTreeNodeToTSNodeMap.get(node);
				const parent = tsNode.parent;
				if (!ts.isArrayLiteralExpression(parent) && !ts.isObjectLiteralExpression(parent)) {
					if (parent.arguments) {
						if (parent.arguments[parent.arguments.length - 1] !== tsNode) {
							context.report({
								node: node,
								messageId: "noPrecedingSpreadElementViolation",
							});
						}
					}
				}
			},
		};
	},
});
