import { getParserServices, makeRule } from "../util/rules";
import { getType, isArrayType, isPossiblyType } from "../util/types";

function makeViolationText(name: string) {
	return `Do not use Array<T> with ${name}(). Key values will not be shifted from 1-indexed to 0-indexed.`;
}

export const noArrayPairsName = "no-array-pairs";
export const noArrayPairs = makeRule<[], "arrayPairsViolation" | "arrayIPairsViolation">({
	name: noArrayPairsName,
	meta: {
		type: "problem",
		docs: {
			description: "Disallows usage of pairs() and ipairs() with Array<T>",
			category: "Possible Errors",
			recommended: "warn",
			requiresTypeChecking: false,
		},
		schema: [],
		messages: {
			arrayPairsViolation: makeViolationText("pairs"),
			arrayIPairsViolation: makeViolationText("ipairs"),
		},
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		const checker = service.program.getTypeChecker();
		return {
			CallExpression(esNode) {
				const tsNode = service.esTreeNodeToTSNodeMap.get(esNode);
				const expressionName = tsNode.expression.getText();
				if (expressionName === "pairs" || expressionName === "ipairs") {
					const argType = getType(checker, tsNode.arguments[0]);
					if (isPossiblyType(argType, t => isArrayType(checker, t))) {
						if (expressionName === "pairs") {
							context.report({
								node: esNode,
								messageId: "arrayPairsViolation",
							});
						} else {
							context.report({
								node: esNode,
								messageId: "arrayIPairsViolation",
							});
						}
					} else {
					}
				}
			},
		};
	},
});
