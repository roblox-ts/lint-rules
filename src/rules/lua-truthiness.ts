import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/experimental-utils";
import { ExpressionWithTest, getParserServices, makeRule, getConstrainedType } from "../util/rules";
import {
	isAssignableToType,
	SimpleTypeKind,
	SimpleType,
	SimpleTypeComparisonOptions,
	toSimpleType,
	isAssignableToSimpleTypeKind,
} from "ts-simple-type";

const falsyStringOrNumber: SimpleType = {
	kind: SimpleTypeKind.INTERSECTION,
	types: [
		{ kind: SimpleTypeKind.NUMBER_LITERAL, value: 0 },
		{ kind: SimpleTypeKind.NUMBER_LITERAL, value: NaN },
		{ kind: SimpleTypeKind.STRING_LITERAL, value: "" },
	],
};

const typeComparisonOptions: SimpleTypeComparisonOptions = { strict: true };

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
			const symbol = getConstrainedType(service, checker, node);

			if (symbol) {
				const simpleType = toSimpleType(symbol, checker);

				if (isAssignableToType(simpleType, falsyStringOrNumber, typeComparisonOptions)) {
					context.report({
						node,
						messageId: "falsyStringNumberCheck",
						fix:
							isAssignableToSimpleTypeKind(simpleType, SimpleTypeKind.UNDEFINED) &&
							!isAssignableToSimpleTypeKind(simpleType, SimpleTypeKind.BOOLEAN)
								? (fix) => fix.insertTextAfter(node, " !== undefined")
								: undefined,
					});
				}
			}
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
			LogicalExpression: ({ left }) => checkTruthy(left),
			'UnaryExpression[operator="!"]': ({ argument }: TSESTree.UnaryExpression) => checkTruthy(argument),
		};
	},
});
