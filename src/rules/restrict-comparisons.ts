import { TSESTree, AST_NODE_TYPES } from "@typescript-eslint/experimental-utils";
import { getParserServices, makeRule, getConstrainedType } from "../util";
import ts from "typescript";
import {
	SimpleType,
	SimpleTypeKind,
	toSimpleType,
	simpleTypeToString,
	isAssignableToType,
	SimpleTypeComparisonOptions,
	SimpleTypeFunctionArgument,
	SimpleTypeMethod,
	SimpleTypeMemberNamed,
	SimpleTypeFunction,
} from "ts-simple-type";

type OverloadNode = MethodDefinition | SignatureDefinition;

type SignatureDefinition =
	| TSESTree.FunctionExpression
	| TSESTree.TSCallSignatureDeclaration
	| TSESTree.TSConstructSignatureDeclaration
	| TSESTree.TSDeclareFunction
	| TSESTree.TSEmptyBodyFunctionExpression
	| TSESTree.TSMethodSignature;

type MethodDefinition = TSESTree.MethodDefinition | TSESTree.TSAbstractMethodDefinition;

const STRING: SimpleType = { kind: SimpleTypeKind.STRING };
const NUMBER: SimpleType = { kind: SimpleTypeKind.NUMBER };
const BIG_INT: SimpleType = { kind: SimpleTypeKind.BIG_INT };
const NUMERIC: SimpleType = {
	kind: SimpleTypeKind.INTERSECTION,
	types: [NUMBER, BIG_INT],
};
const NUMERIC_UNION: SimpleType = {
	kind: SimpleTypeKind.UNION,
	types: [NUMBER, BIG_INT],
};

function isParameteredNode(
	node: ts.Node,
): node is
	| ts.CallSignatureDeclaration
	| ts.ConstructSignatureDeclaration
	| ts.MethodSignature
	| ts.FunctionTypeNode
	| ts.ConstructorTypeNode
	| ts.JSDocFunctionType
	| ts.FunctionDeclaration
	| ts.MethodDeclaration
	| ts.ConstructorDeclaration
	| ts.AccessorDeclaration
	| ts.FunctionExpression
	| ts.ArrowFunction {
	switch (node.kind) {
		case ts.SyntaxKind.Constructor:
		case ts.SyntaxKind.GetAccessor:
		case ts.SyntaxKind.MethodDeclaration:
		case ts.SyntaxKind.SetAccessor:
		case ts.SyntaxKind.JSDocFunctionType:
		case ts.SyntaxKind.ArrowFunction:
		case ts.SyntaxKind.FunctionDeclaration:
		case ts.SyntaxKind.FunctionExpression:
		case ts.SyntaxKind.CallSignature:
		case ts.SyntaxKind.ConstructSignature:
		case ts.SyntaxKind.MethodSignature:
		case ts.SyntaxKind.ConstructorType:
		case ts.SyntaxKind.FunctionType:
			return true;
		default:
			return false;
	}
}

function isSignatureDeclaration(node: ts.Node): node is ts.SignatureDeclaration {
	return node.kind === ts.SyntaxKind.IndexSignature || isParameteredNode(node);
}

function getFunctionReturnType(checker: ts.TypeChecker, decl: ts.Declaration) {
	if (isSignatureDeclaration(decl)) {
		const signature = checker.getSignatureFromDeclaration(decl);
		if (signature) return checker.getReturnTypeOfSignature(signature);
	}
}

const parenthesize = (s: string) => (s.includes(" ") ? `(${s})` : s);

export const restrictComparisonsName = "restrict-comparisons";
export const restrictComparisons = makeRule<
	[],
	| "badComparison"
	| "valueOfLack"
	| "valueOfBadReturnType"
	| "recursiveValueOf"
	| "nonNumericUnion"
	| "badValueOfFunctionType"
>({
	name: restrictComparisonsName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans comparison expressions between unions.",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: true,
		},
		schema: [],
		messages: {
			badComparison:
				"Invalid comparison. Both values must either always be strings or always be numeric values, got: {{ leftType }} {{ operator }} {{ rightType }}",
			nonNumericUnion: "Cannot compare values with union types which aren't `number | bigint`.",
			valueOfLack: "The object referenced in this comparison lacks a non-optional `valueOf` method.",
			badValueOfFunctionType:
				"`{{ name }}` has a `valueOf` function but it isn't a method. Try adding `this: {{ name }}` as the first parameter.",
			valueOfBadReturnType:
				"`valueOf` must return a value castable to either `string` or `number | bigint` and not both.",
			recursiveValueOf:
				"Cannot recursively evaluate valueOf. Try calling `.valueOf()` on the objects being compared.",
		},
		fixable: "code",
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		const checker = service.program.getTypeChecker();
		const numberOrBigInt = ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike;

		const hasNonNumberOrBigInt = (type: ts.Type) =>
			type.isUnionOrIntersection()
				? type.types.some(hasNonNumberOrBigInt)
				: 0 === (type.getFlags() & numberOrBigInt);

		// const checkValueOf = (t1: ts.Type, t2: ts.Type): boolean => {
		// 	const valueOf1 = t1.getProperty("valueOf");
		// 	const valueOf2 = t2.getProperty("valueOf");

		// 	if (valueOf1 && valueOf2) {
		// 		const declarations1 = valueOf1.getDeclarations();
		// 		const declarations2 = valueOf2.getDeclarations();

		// 		if (declarations1 && declarations2) {
		// 			const returnTypes = new Array<ts.Type>();
		// 			for (const declaration of declarations1) {
		// 				const returnType = getFunctionReturnType(checker, declaration);
		// 				if (returnType) returnTypes.push(returnType);
		// 			}

		// 			const res = declarations2.every(declaration => {
		// 				const returnType = getFunctionReturnType(checker, declaration);
		// 				return returnType ? returnTypes.every(retType => !areTypesRight(returnType, retType)) : false;
		// 			});

		// 			return res;
		// 		}
		// 	}
		// 	return false;
		// };

		function skipNodesUpwards<T extends ts.Node>(exp: T, dontSkipParenthesis?: boolean): T;
		function skipNodesUpwards<T extends ts.Node>(exp?: T, dontSkipParenthesis?: boolean): T | undefined;
		function skipNodesUpwards<T extends ts.Node>(exp?: T, dontSkipParenthesis?: boolean) {
			if (exp) {
				while (
					exp &&
					((!dontSkipParenthesis && ts.isParenthesizedExpression(exp)) ||
						ts.isNonNullExpression(exp) ||
						ts.isAsExpression(exp))
				) {
					exp = (exp.parent as unknown) as T;
				}
				return exp;
			}
		}

		function isFunctionExpressionMethod(node: ts.Node) {
			if (!ts.isFunctionExpression(node)) return false;
			const parent = skipNodesUpwards(node.parent);
			return ts.isPropertyAssignment(parent) && ts.isObjectLiteralExpression(skipNodesUpwards(parent.parent));
		}

		function isDeclarationMethodLike(declaration: ts.Declaration) {
			if (isParameteredNode(declaration)) {
				const { parameters } = declaration;
				if (parameters.length > 0) {
					const {
						[0]: { name },
					} = parameters;

					if (
						name.kind === ts.SyntaxKind.Identifier &&
						name.originalKeywordKind === ts.SyntaxKind.ThisKeyword
					) {
						return !(checker.getTypeAtLocation(name).getFlags() & ts.TypeFlags.Void);
					}
				}
			}

			return (
				ts.isMethodDeclaration(declaration) ||
				ts.isMethodSignature(declaration) ||
				isFunctionExpressionMethod(declaration)
			);
		}

		function needsValueOf() {}

		const checkValueOf = (t1: ts.Type) => {
			const valueOf = t1.getProperty("valueOf");

			if (!valueOf) return needsValueOf();
			const declarations = valueOf.getDeclarations();
			if (!declarations) return needsValueOf();

			let isMethodLike = false;
			let isCallbackLike = false;

			for (const declaration of declarations) {
				if (isDeclarationMethodLike(declaration)) {
					isMethodLike = true;
				} else {
					isCallbackLike = true;
				}
			}

			if (isMethodLike === isCallbackLike) {
			}
		};

		const isSameType = (t1: ts.Type, t2: ts.Type): boolean => {
			if (t1.isIntersection()) {
				return t1.types.some(t => isSameType(t, t2));
			} else if (t2.isIntersection()) {
				return t2.types.some(t => isSameType(t, t1));
			} else {
				const t1Flags = t1.getFlags();
				return (
					(t1Flags & t2.getFlags()) !== 0
					// && ((t1Flags & ts.TypeFlags.Object) === 0 || (t1 === t2 && (t1.getProperty("valueOf") ?.getDeclarations() ?.every(declaration => isSignatureDeclaration(declaration) ? !isInValidValueOfSignature(checker.getSignatureFromDeclaration(declaration)) : false) === true)))
				);
			}
		};

		const isInValidValueOfSignature = (q: ts.Signature | undefined) => {
			if (q) {
				const t = checker.getReturnTypeOfSignature(q);
				return hasNonNumberOrBigInt(t) && !isString(t);
			} else {
				return false;
			}
		};

		const isString = (t: ts.Type) =>
			t.isUnion()
				? t.types.every(isString)
				: t.isIntersection()
				? t.types.some(isString)
				: 0 !== (t.getFlags() & ts.TypeFlags.StringLike);

		function isSimpleTypeObjectLike({ kind }: SimpleType) {
			return kind === "CLASS" || kind === "INTERFACE" || kind === "OBJECT";
		}

		function getValueOfSimpleType(s: SimpleType) {
			switch (s.kind) {
				case "CLASS":
					return (
						s.methods.find(method => method.name === "valueOf") ||
						s.properties.find(property => property.name === "valueOf" && property.type.kind === "FUNCTION")
					);
				case "INTERFACE":
				case "OBJECT": {
					const { members } = s;
					// console.log("members", members);
					return members ? members.find(member => member.name === "valueOf") : undefined;
				}
			}
		}

		function isSimpleTypeMethod(s: SimpleType): s is SimpleTypeMethod | SimpleTypeFunction {
			switch (s.kind) {
				case "METHOD": {
					const firstParam = s.argTypes[0] as SimpleTypeFunctionArgument | undefined;
					return !firstParam || firstParam.name !== "this" || firstParam.type.kind !== SimpleTypeKind.VOID;
				}
				case "FUNCTION": {
					const { argTypes } = s;
					if (argTypes) {
						const firstParam = argTypes[0] as SimpleTypeFunctionArgument | undefined;
						return firstParam
							? firstParam.name === "this" && firstParam.type.kind !== SimpleTypeKind.VOID
							: false;
					}
				}
				default:
					return false;
			}
		}

		function checkValueOfDefinition(
			node: TSESTree.Node,
			valueOfType: SimpleTypeFunction | SimpleTypeMethod,
			name = "(Anonymous Object)",
		) {
			const { returnType } = valueOfType;

			if (returnType === undefined) {
				context.report({
					node,
					messageId: "valueOfBadReturnType",
				});
				return;
			}

			return returnType;
		}

		function checkTypes(
			node: TSESTree.BinaryExpression,
			leftType: SimpleType,
			rightType: SimpleType,
			allowObjects: boolean,
		) {
			for (const type of [leftType, rightType]) {
				if (type.kind === "UNION") {
					if (!type.types.every(t => t.kind === "NUMBER" || t.kind === "BIG_INT")) {
						context.report({
							node,
							messageId: "badComparison",
							data: {
								leftType: parenthesize(simpleTypeToString(leftType)),
								rightType: parenthesize(simpleTypeToString(rightType)),
								operator: node.operator,
							},
						});
					}
				}
			}
			// console.log();
			// console.log("checking types");
			// console.log(leftType, isAssignableToType(leftType, NUMERIC));
			// console.log(rightType);
			const isLeftObjectLike = isSimpleTypeObjectLike(leftType);
			const isRightObjectLike = isSimpleTypeObjectLike(rightType);
			// console.log(isLeftObjectLike, isRightObjectLike);
			// console.log();

			if (isLeftObjectLike && isRightObjectLike) {
				if (!allowObjects) {
					context.report({
						node,
						messageId: "recursiveValueOf",
					});
					return;
				}

				// comparing two objects -> check valueOf types
				const leftValueOf = getValueOfSimpleType(leftType);
				const rightValueOf = getValueOfSimpleType(rightType);

				if (!leftValueOf || leftValueOf.optional) {
					context.report({
						node: node.left,
						messageId: "valueOfLack",
					});
				}

				if (!rightValueOf || rightValueOf.optional) {
					context.report({
						node: node.right,
						messageId: "valueOfLack",
						data: {},
					});
				}

				if (!leftValueOf || !rightValueOf) return;

				const leftValueOfType = leftValueOf.type;
				const rightValueOfType = rightValueOf.type;

				if (!isSimpleTypeMethod(leftValueOfType)) {
					context.report({
						node: node.left,
						messageId: "badValueOfFunctionType",
						data: {
							name: leftType.name || "(Anonymous Object)",
						},
					});
					return;
				}

				if (!isSimpleTypeMethod(rightValueOfType)) {
					context.report({
						node: node.right,
						messageId: "badValueOfFunctionType",
						data: {
							name: rightType.name || "(Anonymous Object)",
						},
					});
					return;
				}

				const leftValueOfReturnType = leftValueOfType.returnType;
				const rightValueOfReturnType = rightValueOfType.returnType;

				if (leftValueOfReturnType === undefined) {
					context.report({
						node: node.left,
						messageId: "valueOfBadReturnType",
					});
					return;
				}

				if (rightValueOfReturnType === undefined) {
					context.report({
						node: node.right,
						messageId: "valueOfBadReturnType",
					});
					return;
				}

				checkTypes(node, leftValueOfReturnType, rightValueOfReturnType, false);
			} else if (!isLeftObjectLike && !isRightObjectLike) {
				// comparing two non-objects -> check assignability

				const isLeftString = isAssignableToType(leftType, STRING);
				const isLeftNumber = isAssignableToType(leftType, NUMERIC);

				const isRightString = isAssignableToType(rightType, STRING);
				const isRightNumber = isAssignableToType(rightType, NUMERIC);

				// console.log("____");
				// console.log(leftType);
				// console.log(rightType);
				// console.log(
				// 	isLeftString,
				// 	isLeftNumber,
				// 	isRightString,
				// 	isRightNumber,
				// 	isLeftString === isLeftNumber,
				// 	isRightString === isRightNumber,
				// 	isLeftString !== isRightString,
				// );
				// console.log("____");

				if (
					isLeftString === isLeftNumber ||
					isRightString === isRightNumber ||
					isLeftString !== isRightString
				) {
					context.report({
						node,
						messageId: "badComparison",
						data: {
							leftType: parenthesize(simpleTypeToString(leftType)),
							rightType: parenthesize(simpleTypeToString(rightType)),
							operator: node.operator,
						},
					});
				}
			} else {
				// comparison is between an object and non-object
				context.report({
					node,
					messageId: "badComparison",
					data: {
						leftType: parenthesize(simpleTypeToString(leftType)),
						rightType: parenthesize(simpleTypeToString(rightType)),
						operator: node.operator,
					},
				});
			}
		}

		return {
			BinaryExpression: (node: TSESTree.BinaryExpression) => {
				const { operator } = node;
				if (operator === "<" || operator === ">" || operator === "<=" || operator === ">=") {
					const leftType = checker.getTypeAtLocation(service.esTreeNodeToTSNodeMap.get(node.left));
					const rightType = checker.getTypeAtLocation(service.esTreeNodeToTSNodeMap.get(node.right));

					checkValueOf(checker.getBaseConstraintOfType(leftType) || leftType);
					checkValueOf(checker.getBaseConstraintOfType(rightType) || rightType);
					// const valueOfT = gotten.getProperty("valueOf");
					// if (valueOfT) {
					// 	const declarations = valueOfT.getDeclarations();
					// 	if (declarations) {
					// 		declarations.map(declaration => checker.getSignatureFromDeclaration(declaration));
					// 	}
					// }

					checkTypes(
						node,
						toSimpleType(checker.getBaseConstraintOfType(leftType) || leftType, checker),
						toSimpleType(checker.getBaseConstraintOfType(rightType) || rightType, checker),
						true,
					);
				}

				getConstrainedType;
			},
			MethodDefinition(node) {
				const { key } = node;
				if (
					key.type === AST_NODE_TYPES.Identifier
						? key.name === "valueOf"
						: key.type === AST_NODE_TYPES.Literal && key.value === "valueOf"
				) {
					const signature = checker.getTypeAtLocation(service.esTreeNodeToTSNodeMap.get(node));
					// checker.getSignaturesOfType;

					// console.log(toSimpleType(signature, checker));

					// console.log(
					// 	simpleTypeToString(
					// 		toSimpleType(, checker),
					// 	),
					// );

					// isAssignableToType(service.esTreeNodeToTSNodeMap.get<ts.MethodDeclaration>(node), goodValueOf.members[0])

					// if (isInValidValueOfSignature(signature)) {
					// 	context.report({
					// 		node,
					// 		messageId: "valueOfBadReturnType",
					// 	});
					// }
				}
			},

			Property(node) {
				// console.log(node);
				node.key;
			},
		};
	},
});
