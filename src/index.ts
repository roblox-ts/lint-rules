import { TSESLint } from "@typescript-eslint/experimental-utils";
import {
	misleadingLuatupleChecks,
	noDelete,
	noForIn,
	noGettersOrSetters,
	noNull,
	noRegex,
	noValueTypeOf,
} from "./rules";

/** We just use this for intellisense */
const makePlugin = (obj: {
	configs: {
		[s: string]: { rules: { [a: string]: "error" | "warn" | "off" } };
	};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	rules: { [s: string]: TSESLint.RuleModule<any, any, any> };
}) => {
	const ruleNames = new Set<string>();
	const { rules, configs } = obj;

	for (const ruleName in rules) {
		ruleNames.add(ruleName);
		const url = rules[ruleName].meta.docs.url;
		if (ruleName !== url) {
			throw new Error(`Name mismatch in eslint-plugin-roblox-ts: ${ruleName} vs ${url}`);
		}
	}

	for (const configName in configs) {
		for (const ruleName in configs[configName].rules) {
			if (ruleName.startsWith("roblox-ts/") && !ruleNames.has(ruleName.slice(10))) {
				throw new Error(
					`${ruleName} is not a valid rule defined in eslint-plugin-roblox-ts! Try one of the following: ` +
						[...ruleNames].join(", "),
				);
			}
		}
	}
	return obj;
};

export = makePlugin({
	rules: {
		"misleading-luatuple-checks": misleadingLuatupleChecks,
		"no-delete": noDelete,
		"no-for-in": noForIn,
		"no-getters-or-setters": noGettersOrSetters,
		"no-null": noNull,
		"no-regex": noRegex,
		"no-value-typeof": noValueTypeOf,
	},
	configs: {
		recommended: {
			rules: {
				"roblox-ts/misleading-luatuple-checks": "error",
				"roblox-ts/no-delete": "error",
				"roblox-ts/no-for-in": "error",
				"roblox-ts/no-getters-or-setters": "error",
				"roblox-ts/no-null": "error",
				"roblox-ts/no-regex": "error",
				"roblox-ts/no-value-typeof": "error",

				"no-debugger": "error",
				"no-labels": "error",
				"no-var": "error",
				"no-void": "error",
				"no-with": "error",
				"prefer-rest-params": "error", // disables `arguments`
				eqeqeq: "error",
			},
		},
	},
});
