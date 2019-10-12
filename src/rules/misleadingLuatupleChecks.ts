import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/experimental-utils";
import { ExpressionWithTest, getParserServices, makeRule, getConstrainedType } from "../util";

export const misleadingLuatupleChecksName = "misleading-luatuple-checks";
export const misleadingLuatupleChecks = makeRule<[], "bannedLuaTupleCheck">({
	name: misleadingLuatupleChecksName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans LuaTuples boolean expressions",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: true,
		},
		schema: [],
		messages: {
			bannedLuaTupleCheck: "Unexpected LuaTuple in conditional expression. Add [0].",
		},
		fixable: "code",
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		const checker = service.program.getTypeChecker();

		function checkTruthy(node: TSESTree.Node) {
			const { aliasSymbol } = getConstrainedType(service, checker, node);

			if (aliasSymbol && aliasSymbol.escapedName === "LuaTuple")
				context.report({
					node,
					messageId: "bannedLuaTupleCheck",
					fix: fix => fix.insertTextAfter(node, "[0]"),
				});
		}

		/**
		 * Asserts that a testable expression contains a boolean, reports otherwise.
		 * Filters all LogicalExpressions to prevent some duplicate reports.
		 */
		const containsBoolean = ({ test }: ExpressionWithTest) => {
			if (test && test.type !== AST_NODE_TYPES.LogicalExpression) checkTruthy(test);
		};

		return {
			ConditionalExpression: containsBoolean,
			DoWhileStatement: containsBoolean,
			ForStatement: containsBoolean,
			IfStatement: containsBoolean,
			WhileStatement: containsBoolean,
			LogicalExpression: ({ left, right }) => {
				checkTruthy(left);
				checkTruthy(right);
			},
			'UnaryExpression[operator="!"]': ({ argument }: TSESTree.UnaryExpression) => checkTruthy(argument),
		};
	},
});
