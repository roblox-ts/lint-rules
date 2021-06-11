import { AST_NODE_TYPES } from "@typescript-eslint/experimental-utils";
import { Variable } from "@typescript-eslint/scope-manager/dist/variable/Variable";
import ts from "typescript";
import { getParserServices, makeRule } from "../util/rules";

export const noExportAssignmentLetName = "no-export-assignment-let";
export const noExportAssignmentLet = makeRule<[], "noExportAssignmentLetViolation">({
	name: noExportAssignmentLetName,
	meta: {
		// TODO
		type: "problem",
		docs: {
			description: "Bans using `export =` on a let variable",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		messages: {
			noExportAssignmentLetViolation: "Cannot use `export =` on a `let` variable!",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const service = getParserServices(context);
		return {
			TSExportAssignment(node) {
				const tsNode = service.esTreeNodeToTSNodeMap.get(node);

				const expression = tsNode.expression;
				if (ts.isIdentifier(expression)) {
					const variable: Variable | undefined = context.getScope().variables.find(variable => {
						return variable.identifiers[0].name === expression.escapedText;
					});
					// Not sure why this works?
					if (variable?.defs[0].parent) {
						if (variable.defs[0].parent.type === AST_NODE_TYPES.VariableDeclaration) {
							if (variable.defs[0].parent.kind === "let") {
								context.report({
									node: node,
									messageId: "noExportAssignmentLetViolation",
								});
							}
						}
					}
				}
			},
		};
	},
});
