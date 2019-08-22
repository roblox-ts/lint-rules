import { TSESLint } from "@typescript-eslint/experimental-utils";
import { misleadingLuatupleChecks, noDelete, noGettersOrSetters, noNull, noRegex } from "./rules";
import { noForIn } from "./rules/noForIn";

/** We just use this for intellisense */
const makePlugin = (obj: {
	configs: {
		[s: string]: { rules: { [a: string]: "error" | "warn" | "off" } };
	};
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
						[...ruleNames].join(", ")
				);
			}
		}
	}
	return obj;
};

export = makePlugin({
	rules: {
		"no-null": noNull,
		"misleading-luatuple-checks": misleadingLuatupleChecks,
		"no-for-in": noForIn,
		"no-delete": noDelete,
		"no-regex": noRegex,
		"no-getters-or-setters": noGettersOrSetters
	},
	configs: {
		recommended: {
			rules: {
				"roblox-ts/ban-null": "error",
				"roblox-ts/misleading-luatuple-checks": "error",
				"roblox-ts/no-for-in": "error",
				"roblox-ts/no-delete": "error",
				"roblox-ts/no-regex": "error",
				"roblox-ts/no-getters-or-setters": "error",
				"no-void": "error",
				"no-with": "error",
				"no-debugger": "error",
				"no-labels": "error",
				"prefer-rest-params": "error", // disables `arguments`
				eqeqeq: "error"
			}
		}
	}
});
