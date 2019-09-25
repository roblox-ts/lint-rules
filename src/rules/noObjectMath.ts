import { makeRule, getParserServices, getConstrainedTypeAtLocation } from "../util";
import ts from "typescript";

const dataTypes = ["CFrame", "UDim", "UDim2", "Vector2", "Vector2int16", "Vector3", "Vector3int16"];
const opTypes = new Map([
	["+", "add"] as const,
	["-", "sub"] as const,
	["*", "mul"] as const,
	["/", "div"] as const,
]) as ReadonlyMap<string, string>;

type ViolationType = "addViolation" | "subViolation" | "mulViolation" | "divViolation" | "otherViolation";

export const noObjectMathName = "no-object-math";
export const noObjectMath = makeRule<[], ViolationType>({
	name: noObjectMathName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans math operators from being used on data types",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: true,
		},
		fixable: "code",
		messages: {
			addViolation: "Don't use `+` use .add() instead.",
			subViolation: "Don't use `-` use .sub() instead.",
			mulViolation: "Don't use `*` use .mul() instead.",
			divViolation: "Don't use `/` use .div() instead.",
			otherViolation: "Cannot use this operator on a Roblox Data type.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const sourceCode = context.getSourceCode();
		const service = getParserServices(context);
		const checker = service.program.getTypeChecker();

		return {
			BinaryExpression(node) {
				const { left, right } = node;
				const tsNode = service.esTreeNodeToTSNodeMap.get<ts.ExpressionStatement>(left);
				const type = getConstrainedTypeAtLocation(checker, tsNode);
				const symbol = type.getSymbol();

				if (symbol && dataTypes.includes(symbol.getName())) {
					const oper = opTypes.get(node.operator);
					if (oper) {
						return context.report({
							node,
							messageId: `${oper}Violation` as ViolationType,
							fix: fix => [
								fix.replaceTextRange([left.range[1], right.range[0]], `.${oper}(`),
								fix.insertTextAfter(right, ")"),
							],
						});
					} else {
						return context.report({
							node,
							messageId: "otherViolation",
						});
					}
				}
			},
		};
	},
});
