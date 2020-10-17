import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/experimental-utils";
import { ExpressionWithTest, getParserServices, makeRule } from "../util/rules";
import {
	getType,
	isBooleanType,
	isEmptyStringType,
	isNaNType,
	isNumberLiteralType,
	isPossiblyType,
	isUndefinedType,
} from "../util/types";

export const luaTruthinessName = "lua-truthiness";
export const luaTruthiness = makeRule<[], "falsyStringNumberCheck">({
	name: luaTruthinessName,
	meta: {
		type: "problem",
		docs: {
			description: "Warns against falsy strings and numbers",
			category: "Possible Errors",
			recommended: false,
			requiresTypeChecking: true,
		},
		schema: [],
		messages: {
			falsyStringNumberCheck:
				'0, NaN, and "" are falsy in TS. If intentional, disable this rule by placing `"roblox-ts/lua-truthiness": "off"` in your .eslintrc file in the "rules" object.',
		},
		fixable: "code",
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		const checker = service.program.getTypeChecker();

		function checkTruthy(node: TSESTree.Node) {
			const type = getType(checker, service.esTreeNodeToTSNodeMap.get(node));

			const isAssignableToUndefined = isPossiblyType(type, t => isUndefinedType(t));
			const isAssignableToBoolean = isPossiblyType(type, t => isBooleanType(t));
			const isAssignableToZero = isPossiblyType(type, t => isNumberLiteralType(t, 0));
			const isAssignableToNaN = isPossiblyType(type, t => isNaNType(t));
			const isAssignableToEmptyString = isPossiblyType(type, t => isEmptyStringType(t));

			if (isAssignableToZero || isAssignableToNaN || isAssignableToEmptyString) {
				context.report({
					node,
					messageId: "falsyStringNumberCheck",
					fix:
						isAssignableToUndefined && !isAssignableToBoolean
							? fix => fix.insertTextAfter(node, " !== undefined")
							: undefined,
				});
			}
		}

		/**
		 * Asserts that a testable expression contains a boolean, reports otherwise.
		 * Filters all LogicalExpressions to prevent some duplicate reports.
		 */
		const containsBoolean = ({ test }: ExpressionWithTest) => {
			if (test && test.type !== AST_NODE_TYPES.LogicalExpression) {
				checkTruthy(test);
			}
		};

		return {
			ConditionalExpression: containsBoolean,
			DoWhileStatement: containsBoolean,
			ForStatement: containsBoolean,
			IfStatement: containsBoolean,
			WhileStatement: containsBoolean,
			LogicalExpression: ({ left, operator }) => operator !== "??" && checkTruthy(left),
			'UnaryExpression[operator="!"]': ({ argument }: TSESTree.UnaryExpression) => checkTruthy(argument),
		};
	},
});
