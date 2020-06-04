import ts from "typescript";

declare module "typescript" {
	export interface SourceFile {
		externalModuleIndicator?: ts.Node;
	}
}
