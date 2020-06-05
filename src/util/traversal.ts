import ts from "typescript";

export function skipDownwards(node: ts.Expression): ts.Expression;
export function skipDownwards(node: ts.Node): ts.Node {
	while (ts.isNonNullExpression(node) || ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) {
		node = node.expression;
	}
	return node;
}

export function skipUpwards(node: ts.Node) {
	let parent = node.parent;
	while (
		parent &&
		(ts.isNonNullExpression(parent) || ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent))
	) {
		node = parent;
		parent = node.parent;
	}
	return node;
}
