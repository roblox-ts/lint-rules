import ts, { ElementFlags, isPrivateIdentifier, isRestTypeNode } from "typescript";
import { getParserServices, makeRule } from "../util/rules";

export const noSpreadDestructuringName = "no-spread-destructuring";
export const noSpreadDestructuring = makeRule<[], "spreadDestructuringViolation">({
	name: noSpreadDestructuringName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans spread destructuring from being used",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		messages: {
			spreadDestructuringViolation: "spreadDestructuring is not supported!",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		return {
			ArrayPattern(node) {
				node.elements.forEach(element => {
					console.log(element);
					if (element?.type == "RestElement") {
						context.report({
							node: node,
							messageId: "spreadDestructuringViolation",
						});
					}
				});
				const tsNode = service.esTreeNodeToTSNodeMap.get(node);
				// tsNode.elements.forEach((element: ts.Node) => {
				// 	console.log(element);
				// 	if (isRestTypeNode(element)) {
				// 		context.report({
				// 			node: node,
				// 			messageId: "spreadDestructuringViolation",
				// 		});
				// 	}
				// });
			},
		};
	},
});
