import { ESLintUtils, ParserServices, TSESLint, TSESTree, AST_NODE_TYPES } from "@typescript-eslint/experimental-utils";
import ts from "typescript";

export const makeRule = ESLintUtils.RuleCreator(name => {
	return name;
});

type ExtractStringMembers<T> = Extract<T[keyof T], string>;

export const robloxTSSettings = (
	o: { [K in ExtractStringMembers<typeof import("./rules")>]: "error" | "warn" | "off" },
) => {
	const settings: {
		[K: string]: "error" | "warn" | "off";
	} = {};

	for (const [name, setting] of Object.entries(o)) {
		settings[`roblox-ts/${name}`] = setting;
	}

	return settings;
};

export type ExpressionWithTest =
	| TSESTree.ConditionalExpression
	| TSESTree.DoWhileStatement
	| TSESTree.ForStatement
	| TSESTree.IfStatement
	| TSESTree.WhileStatement;

export type RequiredParserServices = { [K in keyof ParserServices]: Exclude<ParserServices[K], undefined> };

/**
 * Try to retrieve typescript parser service from context.
 */
export function getParserServices<TMessageIds extends string, TOptions extends Array<unknown>>(
	context: TSESLint.RuleContext<TMessageIds, TOptions>,
): RequiredParserServices {
	const { parserServices } = context;
	if (!parserServices || !parserServices.program || !parserServices.esTreeNodeToTSNodeMap) {
		/**
		 * The user needs to have configured "project" in their parserOptions
		 * for @typescript-eslint/parser
		 */
		throw new Error(
			'You have used a rule which requires parserServices to be generated. You must therefore provide a value for the "parserOptions.project" property for @typescript-eslint/parser.',
		);
	}
	return parserServices as RequiredParserServices;
}

/**
 * Resolves the given node's type. Will resolve to the type's generic constraint, if it has one.
 */
export function getConstrainedTypeAtLocation(checker: ts.TypeChecker, node: ts.Node): ts.Type {
	const nodeType = checker.getTypeAtLocation(node);
	return checker.getBaseConstraintOfType(nodeType) || nodeType;
}

export function getConstrainedType(service: RequiredParserServices, checker: ts.TypeChecker, node: TSESTree.Node) {
	return getConstrainedTypeAtLocation(checker, service.esTreeNodeToTSNodeMap.get(node));
}

function skipNodesES(node: TSESTree.Node) {
	while (node.type === AST_NODE_TYPES.TSNonNullExpression || node.type === AST_NODE_TYPES.TSTypeAssertion) {
		node = node.expression;
	}

	return node;
}

function hasTypeFlag(type: ts.Type, flag: ts.TypeFlags) {
	return (type.getFlags() & flag) === flag;
}
