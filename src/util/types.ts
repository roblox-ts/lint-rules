import ts from "typescript";
import { skipUpwards } from "./traversal";

export function getType(checker: ts.TypeChecker, node: ts.Node) {
	return checker.getTypeAtLocation(skipUpwards(node));
}

export function typeConstraint(type: ts.Type, callback: (type: ts.Type) => boolean): boolean {
	if (type.isUnion()) {
		return type.types.every((t) => typeConstraint(t, callback));
	} else if (type.isIntersection()) {
		return type.types.some((t) => typeConstraint(t, callback));
	} else {
		return callback(type);
	}
}

export function isSomeType(type: ts.Type, cb: (type: ts.Type) => boolean) {
	if (typeConstraint(type, cb)) {
		return true;
	} else {
		const constraint = type.getConstraint();
		if (constraint && typeConstraint(constraint, cb)) {
			return true;
		}
	}
	return false;
}

export function isAnyType(type: ts.Type) {
	return isSomeType(type, (t) => !!(t.flags & ts.TypeFlags.Any));
}

export function isArrayType(checker: ts.TypeChecker, type: ts.Type) {
	return isSomeType(type, (t) => {
		if (checker.isTupleType(t) || checker.isArrayLikeType(t)) {
			return true;
		}
		if (t.symbol) {
			if (
				t.symbol.name === "ReadonlyArray" ||
				t.symbol.name === "Array" ||
				t.symbol.name === "ReadVoxelsArray" ||
				t.symbol.name === "TemplateStringsArray"
			) {
				return true;
			}
		}
		return false;
	});
}

export function getTypeArguments(checker: ts.TypeChecker, type: ts.Type) {
	return checker.getTypeArguments(type as ts.TypeReference) ?? [];
}
