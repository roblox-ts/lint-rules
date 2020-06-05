import { TSESTree } from "@typescript-eslint/experimental-utils";
import ts from "typescript";
import { getParserServices, makeRule } from "../util/rules";
import { getType, isAnyType } from "../util/types";

export const noAnyName = "no-any";
export const noAny = makeRule<[], "anyViolation">({
	name: noAnyName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans prototype from being used",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		messages: {
			anyViolation: "Using values of type `any` is not supported! Use `unknown` instead.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		const checker = service.program.getTypeChecker();

		function validateNotAnyType(esNode: TSESTree.Expression, tsNode: ts.Expression) {
			if (isAnyType(getType(checker, tsNode))) {
				context.report({
					messageId: "anyViolation",
					node: esNode,
				});
			}
		}

		return {
			BinaryExpression(esNode) {
				const tsNode = service.esTreeNodeToTSNodeMap.get(esNode);
				validateNotAnyType(esNode.left, tsNode.left);
				validateNotAnyType(esNode.right, tsNode.right);
			},

			UnaryExpression(esNode) {
				const tsNode = service.esTreeNodeToTSNodeMap.get(esNode);
				if (ts.isPrefixUnaryExpression(tsNode) || ts.isPostfixUnaryExpression(tsNode)) {
					validateNotAnyType(esNode.argument, tsNode.operand);
				}
			},

			CallExpression(esNode) {
				const tsNode = service.esTreeNodeToTSNodeMap.get(esNode);
				validateNotAnyType(esNode.callee, tsNode.expression);
				for (let i = 0; i < esNode.arguments.length; i++) {
					validateNotAnyType(esNode.arguments[i], tsNode.arguments[i]);
				}
			},

			NewExpression(esNode) {
				const tsNode = service.esTreeNodeToTSNodeMap.get(esNode);
				validateNotAnyType(esNode.callee, tsNode.expression);
				if (tsNode.arguments) {
					for (let i = 0; i < esNode.arguments.length; i++) {
						validateNotAnyType(esNode.arguments[i], tsNode.arguments[i]);
					}
				}
			},

			SpreadElement(esNode) {
				validateNotAnyType(esNode.argument, service.esTreeNodeToTSNodeMap.get(esNode).expression);
			},

			MemberExpression(esNode) {
				const tsNode = service.esTreeNodeToTSNodeMap.get(esNode);
				validateNotAnyType(esNode.object, tsNode.expression);
				if (ts.isElementAccessExpression(tsNode)) {
					validateNotAnyType(esNode.property, tsNode.argumentExpression);
				}
			},
		};
	},
});
