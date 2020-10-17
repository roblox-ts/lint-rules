import ts from "typescript";
import { skipUpwards } from "./traversal";

export function getType(typeChecker: ts.TypeChecker, node: ts.Node) {
	return typeChecker.getTypeAtLocation(skipUpwards(node));
}

function getRecursiveBaseTypesInner(result: Array<ts.Type>, type: ts.InterfaceType) {
	for (const baseType of type.getBaseTypes() ?? []) {
		result.push(baseType);
		if (baseType.isClassOrInterface()) {
			getRecursiveBaseTypesInner(result, baseType);
		}
	}
}

function getRecursiveBaseTypes(type: ts.InterfaceType) {
	const result = new Array<ts.Type>();
	getRecursiveBaseTypesInner(result, type);
	return result;
}

function isDefinitelyTypeInner(type: ts.Type, callback: (type: ts.Type) => boolean): boolean {
	if (type.isUnion()) {
		return type.types.every(t => isDefinitelyTypeInner(t, callback));
	} else if (type.isIntersection()) {
		return type.types.some(t => isDefinitelyTypeInner(t, callback));
	} else {
		if (type.isClassOrInterface() && getRecursiveBaseTypes(type).some(t => isDefinitelyTypeInner(t, callback))) {
			return true;
		}
		return callback(type);
	}
}

export function isDefinitelyType(type: ts.Type, cb: (type: ts.Type) => boolean) {
	return isDefinitelyTypeInner(type.getConstraint() ?? type, cb);
}

function isPossiblyTypeInner(type: ts.Type, callback: (type: ts.Type) => boolean): boolean {
	if (type.isUnionOrIntersection()) {
		return type.types.some(t => isPossiblyTypeInner(t, callback));
	} else {
		if (type.isClassOrInterface() && getRecursiveBaseTypes(type).some(t => isPossiblyTypeInner(t, callback))) {
			return true;
		}

		// type variable without constraint, any, or unknown
		if (!!(type.flags & (ts.TypeFlags.TypeVariable | ts.TypeFlags.Any | ts.TypeFlags.Unknown))) {
			return true;
		}

		// defined type
		if (isObjectType(type) && type.getProperties().length === 0) {
			return true;
		}

		return callback(type);
	}
}

export function isPossiblyType(type: ts.Type, cb: (type: ts.Type) => boolean) {
	return isPossiblyTypeInner(type.getConstraint() ?? type, cb);
}

export function isAnyType(type: ts.Type) {
	return !!(type.flags & ts.TypeFlags.Any);
}

export function isBooleanType(type: ts.Type) {
	return !!(type.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral));
}

export function isBooleanLiteralType(typeChecker: ts.TypeChecker, type: ts.Type, value: boolean) {
	if (!!(type.flags & ts.TypeFlags.BooleanLiteral)) {
		const valueType = value ? typeChecker.getTrueType() : typeChecker.getFalseType();
		return type === valueType;
	}
	return isBooleanType(type);
}

export function isNumberType(type: ts.Type) {
	return !!(type.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLike | ts.TypeFlags.NumberLiteral));
}

export function isNumberLiteralType(type: ts.Type, value: number) {
	if (type.isNumberLiteral()) {
		return type.value === value;
	}
	return isNumberType(type);
}

export function isNaNType(type: ts.Type) {
	return isNumberType(type) && !type.isNumberLiteral();
}

export function isStringType(type: ts.Type) {
	return !!(type.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLike | ts.TypeFlags.StringLiteral));
}

export function isObjectType(type: ts.Type) {
	return !!(type.flags & ts.TypeFlags.Object);
}

export function isUndefinedType(type: ts.Type) {
	return !!(type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void));
}

export function isEmptyStringType(type: ts.Type) {
	if (type.isStringLiteral()) {
		return type.value === "";
	}
	return isStringType(type);
}

export function isArrayType(checker: ts.TypeChecker, type: ts.Type) {
	if (checker.isTupleType(type) || checker.isArrayLikeType(type)) {
		return true;
	}
	if (type.symbol) {
		if (
			type.symbol.name === "ReadonlyArray" ||
			type.symbol.name === "Array" ||
			type.symbol.name === "ReadVoxelsArray" ||
			type.symbol.name === "TemplateStringsArray"
		) {
			return true;
		}
	}
	return false;
}

export function getTypeArguments(typeChecker: ts.TypeChecker, type: ts.Type) {
	return typeChecker.getTypeArguments(type as ts.TypeReference) ?? [];
}
