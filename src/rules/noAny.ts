import { TSESTree } from "@typescript-eslint/experimental-utils";
import ts from "typescript";
import { getParserServices, makeRule } from "../util/rules";
import { skipDownwards } from "../util/traversal";
import { getType, getTypeArguments, isAnyType, isArrayType, isDefinitelyType } from "../util/types";

export const noAnyName = "no-any";
export const noAny = makeRule<[], "anyViolation">({
	name: noAnyName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans prototype from being used",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: true,
		},
		messages: {
			anyViolation: "Using values of type `any` is not supported! Use `unknown` instead.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		function validateNotAnyType(checker: ts.TypeChecker, esNode: TSESTree.Expression, tsNode: ts.Expression) {
			if (ts.isSpreadElement(tsNode)) {
				tsNode = skipDownwards(tsNode.expression);
			}

			let type = getType(checker, tsNode);

			if (isDefinitelyType(type, t => isArrayType(checker, t))) {
				// Array<T> -> T
				const typeArguments = getTypeArguments(checker, type);
				if (typeArguments.length > 0) {
					type = typeArguments[0];
				}
			}

			if (isAnyType(type)) {
				context.report({
					messageId: "anyViolation",
					node: esNode,
				});
			}
		}

		return {
			BinaryExpression(esNode) {
				const service = getParserServices(context);
				const checker = service.program.getTypeChecker();
				const tsNode = service.esTreeNodeToTSNodeMap.get(esNode);
				validateNotAnyType(checker, esNode.left, tsNode.left);
				validateNotAnyType(checker, esNode.right, tsNode.right);
			},

			UnaryExpression(esNode) {
				const service = getParserServices(context);
				const checker = service.program.getTypeChecker();
				const tsNode = service.esTreeNodeToTSNodeMap.get(esNode);
				if (ts.isPrefixUnaryExpression(tsNode) || ts.isPostfixUnaryExpression(tsNode)) {
					validateNotAnyType(checker, esNode.argument, tsNode.operand);
				}
			},

			CallExpression(esNode) {
				const service = getParserServices(context);
				const checker = service.program.getTypeChecker();
				validateNotAnyType(checker, esNode.callee, service.esTreeNodeToTSNodeMap.get(esNode).expression);
			},

			NewExpression(esNode) {
				const service = getParserServices(context);
				const checker = service.program.getTypeChecker();
				validateNotAnyType(checker, esNode.callee, service.esTreeNodeToTSNodeMap.get(esNode).expression);
			},

			SpreadElement(esNode) {
				const service = getParserServices(context);
				const checker = service.program.getTypeChecker();
				validateNotAnyType(checker, esNode.argument, service.esTreeNodeToTSNodeMap.get(esNode).expression);
			},

			MemberExpression(esNode) {
				const service = getParserServices(context);
				const checker = service.program.getTypeChecker();
				const tsNode = service.esTreeNodeToTSNodeMap.get(esNode);
				validateNotAnyType(checker, esNode.object, tsNode.expression);
				if (ts.isElementAccessExpression(tsNode)) {
					validateNotAnyType(checker, esNode.property, tsNode.argumentExpression);
				}
			},
		};
	},
});
