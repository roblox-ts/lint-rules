import { makeRule, getParserServices, getConstrainedTypeAtLocation } from "../util";
import ts from "typescript";

const dataTypes = ["CFrame", "UDim", "UDim2", "Vector2", "Vector2int16", "Vector3", "Vector3int16"] as const;
const opTypes = new Map([
	["+", "add"] as const,
	["-", "sub"] as const,
	["*", "mul"] as const,
	["/", "div"] as const,
]) as ReadonlyMap<string, string>;

type ViolationType = "newViolation";

export const noRbxPostFixNewName = "no-rbx-postfix-new";
export const noRbxPostFixNew = makeRule<[], ViolationType>({
	name: noRbxPostFixNewName,
	meta: {
		type: "problem",
		docs: {
			description: "Bans calling .new() on Roblox objects (helps transition to TS)",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: true,
		},
		fixable: "code",
		messages: {
			newViolation: "Don't use `.new` use `new X()` instead.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const sourceCode = context.getSourceCode();
		const service = getParserServices(context);
		const checker = service.program.getTypeChecker();

		// TODO: implement

		return {};
	},
});
