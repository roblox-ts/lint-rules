import ts from "typescript";
import { getParserServices, makeRule } from "../util/rules";

export const noPrototypeName = "no-prototype";
export const noPrototype = makeRule<[], "prototypeViolation">({
	name: noPrototypeName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans prototype from being used",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		messages: {
			prototypeViolation: "`prototype` is not supported!",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		return {
			MemberExpression(node) {
				const tsNode = service.esTreeNodeToTSNodeMap.get(node);
				if (ts.isPrototypeAccess(tsNode)) {
					context.report({
						node: node,
						messageId: "prototypeViolation",
					});
				}
			},
		};
	},
});
