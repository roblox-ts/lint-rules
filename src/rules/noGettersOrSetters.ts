import { TSESTree } from "@typescript-eslint/typescript-estree";
import { makeRule } from "../util";

export const noGettersOrSetters = makeRule<[], "getterSetterViolation">({
	name: "no-getters-or-setters",
	meta: {
		type: "problem",
		docs: {
			description: "Disallows getters and setters",
			category: "Possible Errors",
			recommended: "error",
			requiresTypeChecking: false,
		},
		schema: [],
		messages: {
			getterSetterViolation:
				"Getters and Setters are not supported for performance reasons. Please use a normal method instead.",
		},
		fixable: "code",
	},
	defaultOptions: [],
	create(context) {
		function checkMethodDefinition(
			node: TSESTree.ObjectExpression | TSESTree.ClassBody,
			fields: Array<TSESTree.ClassElement> | Array<TSESTree.ObjectLiteralElementLike>,
		) {
			for (const prop of fields) {
				if ("kind" in prop && (prop.kind === "get" || prop.kind === "set")) {
					context.report({
						node,
						messageId: "getterSetterViolation",
						fix: fix => fix.replaceTextRange([prop.range[0] + 3, prop.key.range[0]], ""),
					});
				}
			}
		}

		return {
			ObjectExpression: node => checkMethodDefinition(node, node.properties),
			ClassBody: node => checkMethodDefinition(node, node.body),
		};
	},
});
