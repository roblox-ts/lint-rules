import { ESLintUtils } from "@typescript-eslint/experimental-utils";
import { TSESTree, AST_NODE_TYPES, ParserServices, TSESLint } from "@typescript-eslint/experimental-utils";
import ts from "typescript";

type ExpressionWithTest =
	| TSESTree.ConditionalExpression
	| TSESTree.DoWhileStatement
	| TSESTree.ForStatement
	| TSESTree.IfStatement
	| TSESTree.WhileStatement;

type RequiredParserServices = { [k in keyof ParserServices]: Exclude<ParserServices[k], undefined> };

/**
 * Try to retrieve typescript parser service from context
 */
function getParserServices<TMessageIds extends string, TOptions extends unknown[]>(
	context: TSESLint.RuleContext<TMessageIds, TOptions>,
): RequiredParserServices {
	if (!context.parserServices || !context.parserServices.program || !context.parserServices.esTreeNodeToTSNodeMap) {
		/**
		 * The user needs to have configured "project" in their parserOptions
		 * for @typescript-eslint/parser
		 */
		throw new Error(
			'You have used a rule which requires parserServices to be generated. You must therefore provide a value for the "parserOptions.project" property for @typescript-eslint/parser.',
		);
	}
	return context.parserServices as RequiredParserServices;
}

/**
 * Resolves the given node's type. Will resolve to the type's generic constraint, if it has one.
 */
function getConstrainedTypeAtLocation(checker: ts.TypeChecker, node: ts.Node): ts.Type {
	const nodeType = checker.getTypeAtLocation(node);
	const constrained = checker.getBaseConstraintOfType(nodeType);

	return constrained || nodeType;
}

export = {
	rules: {
		"ban-null": ESLintUtils.RuleCreator(name => name)<[], "bannedNullMessage">({
			name: "ban-null",
			meta: {
				type: "problem",
				docs: {
					description: "Bans null from being used",
					category: "Possible Errors",
					recommended: "error",
				},
				fixable: "code",
				messages: {
					bannedNullMessage: "Don't use null. Use undefined instead",
				},
				schema: [],
			},
			defaultOptions: [],
			create(context) {
				return {
					TSNullKeyword(node) {
						context.report({
							node: node,
							messageId: "bannedNullMessage",
							fix: fixer => fixer.replaceText(node, "undefined"),
						});
					},

					Literal(node) {
						if (node.value === null)
							context.report({
								node: node,
								messageId: "bannedNullMessage",
								fix: fixer => fixer.replaceText(node, "undefined"),
							});
					},
				};
			},
		}),

		"ban-luatuple-checks": ESLintUtils.RuleCreator(name => name)<
			[],
			"bannedLuaTupleCheck" | "bannedImplicitTupleCheck"
		>({
			name: "ban-luatuple-checks",
			meta: {
				type: "problem",
				docs: {
					description: "Bans LuaTuples boolean expressions",
					category: "Possible Errors",
					recommended: "error",
					//   requiresTypeChecking: true,
				},
				schema: [
					{
						type: "object",
						properties: {},
						additionalProperties: false,
					},
				],
				messages: {
					bannedLuaTupleCheck: "Unexpected LuaTuple in conditional expression. Add [0].",
					bannedImplicitTupleCheck:
						'Unexpected implicit truthy check of a Lua built-in method: A return value of 0 or "" would evaluate as false.',
				},
				fixable: "code",
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
								fix: fix => fix.insertTextAfter(node, " !== undefined"),
							});
						}
					}

					if (symbol && symbol.escapedName === "LuaTuple") {
						return context.report({
							node,
							messageId: "bannedLuaTupleCheck",
							fix: fix => fix.insertTextAfter(node, "[0]"),
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
					'UnaryExpression[operator="!"]': ({ argument }: TSESTree.UnaryExpression) => checkTruthy(argument),
				};
			},
		}),
	},
};