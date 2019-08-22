import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/experimental-utils";
import ts from "typescript";
import { ExpressionWithTest, getConstrainedTypeAtLocation, getParserServices, makeRule } from "../util";

export const misleadingLuatupleChecks = makeRule<[], "bannedLuaTupleCheck" | "bannedImplicitTupleCheck">({
	name: "misleading-luatuple-checks",
	meta: {
		type: "problem",
		docs: {
			description: "Bans LuaTuples boolean expressions",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: true
		},
		schema: [],
		messages: {
			bannedLuaTupleCheck: "Unexpected LuaTuple in conditional expression. Add [0].",
			bannedImplicitTupleCheck:
				'Unexpected implicit truthy check of a Lua built-in method: A return value of 0 or "" would evaluate as false.'
		},
		fixable: "code"
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		const checker = service.program.getTypeChecker();

		/**
		 * Determines if the node has a boolean type.
		 */
		function checkTruthy(node: TSESTree.Node) {
			const tsNode = service.esTreeNodeToTSNodeMap.get<ts.ExpressionStatement>(node);
			const type = getConstrainedTypeAtLocation(checker, tsNode);
			const symbol = type.aliasSymbol;

			if (
				ts.isElementAccessExpression(tsNode) &&
				ts.isCallExpression(tsNode.expression) &&
				ts.isPropertyAccessExpression(tsNode.expression.expression)
			) {
				const methodSymbol = checker.getSymbolAtLocation(tsNode.expression.expression.name);

				if (
					methodSymbol &&
					methodSymbol
						.getJsDocTags()
						.some(doc => doc.name === "rbxts" && doc.text === "disallow-tuple-truthy")
				) {
					return context.report({
						node,
						messageId: "bannedImplicitTupleCheck",
						fix: fix => fix.insertTextAfter(node, " !== undefined")
					});
				}
			}

			if (symbol && symbol.escapedName === "LuaTuple") {
				return context.report({
					node,
					messageId: "bannedLuaTupleCheck",
					fix: fix => fix.insertTextAfter(node, "[0]")
				});
			}
		}

		/**
		 * Asserts that a testable expression contains a boolean, reports otherwise.
		 * Filters all LogicalExpressions to prevent some duplicate reports.
		 */
		const containsBoolean = ({ test }: ExpressionWithTest) =>
			void (test !== null && test.type !== AST_NODE_TYPES.LogicalExpression && checkTruthy(test));

		return {
			ConditionalExpression: containsBoolean,
			DoWhileStatement: containsBoolean,
			ForStatement: containsBoolean,
			IfStatement: containsBoolean,
			WhileStatement: containsBoolean,
			LogicalExpression: node => {
				checkTruthy(node.left);
				checkTruthy(node.right);
			},
			'UnaryExpression[operator="!"]': ({ argument }: TSESTree.UnaryExpression) => checkTruthy(argument)
		};
	}
});
