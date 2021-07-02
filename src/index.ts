import { TSESLint } from "@typescript-eslint/experimental-utils";
import * as ruleImports from "./rules";
import { makeRule, robloxTSSettings } from "./util/rules";

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
		const url = rules[ruleName].meta.docs?.url;
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

function getRules() {
	const rules: { [K: string]: ReturnType<typeof makeRule> } = {};
	for (const [i, ruleName] of Object.entries(ruleImports).filter(t => t[0].endsWith("Name")) as Array<
		[string, string]
	>) {
		rules[ruleName as string] = ruleImports[i.slice(0, -4) as keyof typeof ruleImports] as ReturnType<
			typeof makeRule
		>;
	}
	return rules;
}

export = makePlugin({
	rules: getRules(),
	configs: {
		recommended: {
			rules: {
				...robloxTSSettings({
					"no-any": "error",
					"no-delete": "error",
					"no-enum-merging": "error",
					"no-for-in": "error",
					"no-function-expression-id": "error",
					"no-getters-or-setters": "error",
					"no-global-this": "error",
					"no-namespace-merging": "error",
					"no-null": "error",
					"no-object-math": "error",
					"no-prototype": "error",
					"no-rbx-postfix-new": "error",
					"no-regex": "error",
					"no-value-typeof": "error",
					"no-private-identifier": "error",
					"no-spread-destructuring": "error",
					"no-export-assignment-let": "error",
					"no-preceding-spread-element": "error",
					module: "error",

					"misleading-luatuple-checks": "warn",
					"lua-truthiness": "warn",
					"no-array-pairs": "warn",
				}),
				"no-debugger": "error",
				"no-labels": "error",
				"no-sequences": "error",
				"no-sparse-arrays": "warn",
				"no-var": "error",
				"no-void": "error",
				"no-with": "error",
				"prefer-rest-params": "error", // disables `arguments`
				eqeqeq: "error",

				// @typescript-eslint
				"@typescript-eslint/ban-types": "off",
				"@typescript-eslint/explicit-function-return-type": "off",
				"@typescript-eslint/explicit-module-boundary-types": "off",
				"@typescript-eslint/no-empty-function": "off",
				"@typescript-eslint/no-empty-interface": "off",
				"@typescript-eslint/no-namespace": "off",
				"@typescript-eslint/no-non-null-assertion": "off",
				"@typescript-eslint/no-unused-vars": "off",
				"@typescript-eslint/no-var-requires": "off",
			},
		},
	},
});
