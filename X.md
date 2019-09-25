# Adding an intermediary compilation step

Because we should be better equipped to, there are a few priorities we should hit in order to make it worth the abstraction of an intermediary step. The current state of this repository looks like a mini version of what roblox-ts already does and still has the same drawbacks of the old system. If the only thing this would add is source-mapping, we could more easily just inject that into the existing compiler, without a need for this unnecessary abstraction. The current state is obviously unfinished, and I may be criticizing placeholders, but I want to put forward my thoughts on what the intermediary compilation step should look like.

## Performant by design

If we move over to an intermediary step, we want to make sure it is performant. We want the intermediary step to be part of what makes roblox-ts faster, not slower. Creating an AST adds overhead since it is yet another build step and yet another layer of abstraction. However, there are opportunities for optimizing the build process which aren't viable with the current roblox-ts implementation. If we plan for the right optimizations, the added overhead could be made up for.

- We want to move to raw TS, away from ts-morph. ts-morph is a great project and makes many things super easy to work with, but just instantiating the wrapper nodes takes up a lot of compilation time. I have estimated a 2.5 time difference between using raw TS and using ts-morph. We will always use ts-morph for things like our type generator but since we need to squeeze every ounce of performance we can, we need to use raw TS. In the past, ts-morph has allowed for rapid development, and now that roblox-ts is becoming more stable, we can safely move to the raw version. Also, once https://github.com/microsoft/TypeScript/pull/33584 is shipped, we can use a smaller TS dependency. This may or may not mean a slight speed increase in start-up times, although this is already pretty low (200 ms or less).

- We should avoid unnecessary abstractions and avoid doing the same checks twice. This doesn't have to be a feature-complete Lua AST, it just has to be an intermediary AST. It doesn't need to work like the TS AST, and it doesn't need tons of bells and whistles a fully featured universal Lua AST system would need.
    - [The typeguards file](https://github.com/roblox-ts/lua-ast-renderer/blob/0f5a3e48b25fa0313b36db5e29858b535b2d3b28/src/typeGuards.ts) is mostly just a waste of compute time. We already perform these kinds of checks on the TS AST, and there is no reason to recheck what type a LuaAST node is given. We should bundle each AST node with the function that compiles the node.
	- We probably don't need a `trueLiteral` and `falseLiteral` and `nilLiteral` and `identifier`. We could probably get by with just `literalValue`, or even just a regular string. We still need construct literals like tables, but we shouldn't call those literals (there is no non-literal table in the AST). This is unnecessary abstraction for an intermdiary AST. So is a [varArgs node](https://github.com/roblox-ts/lua-ast-renderer/blob/0f5a3e48b25fa0313b36db5e29858b535b2d3b28/src/render/expression/varArgs.ts). We should just have a `hasVarArgs` property of parameter signatures.
	- There should be no need to [disambiguate between different kinds of tables](https://github.com/roblox-ts/lua-ast-renderer/blob/0f5a3e48b25fa0313b36db5e29858b535b2d3b28/src/render/expression/tableLiteral.ts#L11) in the intermediary AST. The kind of node something is and the compile function it ships with should be the disambiguation. **We don't need to stick to raw Lua node types**. We could have a `Set` node, a `Map` node, an `Array` node, and an `Object` node. There is no need to try to shove all of those into one. We might combine Sets and Maps into `Object`, if it seems convenient enough in the final implementation, but there is no reason, for example, to [check whether a table is an `Array` vs an `Object` in the intermediary AST compilation](https://github.com/roblox-ts/lua-ast-renderer/blob/0f5a3e48b25fa0313b36db5e29858b535b2d3b28/src/render/expression/tableLiteral.ts#L11).
	- We don't need `lua.BinaryOperator.Plus` types or the like. Just put a string in there. `"+" | "-" | "*" | "/" | "^"` would work fine. We shouldn't be redoing in the LuaAST [the work we already did when assembling the LuaAST](https://github.com/roblox-ts/lua-ast-renderer/blob/0f5a3e48b25fa0313b36db5e29858b535b2d3b28/src/render/expression/binary.ts#L8-L20).


- We should prefer `results.push(str1, str2)` over the original method of `results += str1 + str2` and returning the `results` string. Inner functions should push directly to a global `results` array, and shouldn't return a string up the stack to be concatenated. The array should be assembled in order and final concatenation should occur by an ending `results.join("")`. This is to reduce intermediate string creation (because we can create hundreds of thousands of intermediate strings).
    - We cannot do this easily in the roblox-ts compiler, since we have some out of order compilation and we often compile code and check for side effects. The intermediary AST should allow for more performant compilation this way. All metadata necessary for compilation should be readily available in the intermediary AST.

- Likewise, an intermediary AST would allow us to compile the AST in order, without recursively deep returns. Consider the following example of how we could use recursive depth parsing to efficiently convert this into an intermediary AST.


TS:
```ts
print(i, (x = ++i) * (x ? 1 : 0));
```
TS AST:
```
CallExpression - print
    arguments: i, BinaryExp *
                /          \
            BinaryExp =    ConditionalExp - x ? 1 : 0
            /       \
            x         Unary ++
                        \
                         i
```
Pseudo roblox-ts. A bit simplified, but this is mostly it:
```
enter `print`:
  enter `i`
    Lookahead in the TS AST, see that `i` is modified. Do LuaAST.pushNewId(i)
    exit
  enter `*`:
    enter `=`:
      enter `++`:
        Do LuaAST.push(LuaAST.UnaryPlusPlus(`i`))
        Lookahead to see if `i` is modified within this expression. It isn't. Don't push to id.
		Push `i` to dependent variables for this exp.
        exit
      Lookahead to see if x is modified in the same expression. It isn't. Don't push to id.
	  Push `x` to dependent variables for this exp.
      do LuaAST.push(LuaAST.eq(x, i))
      exit
    enter `? ... :`:
      do LuaAST.push(LuaAST.ternaryConditional(x, 1, 0))
      exit
    Lookahead to see if `x` or `i` are modified in subsequent `print` arguments.
    There aren't any: don't push this entire expression to a newId.
    exit
  do LuaAST.push(LuaAST.callExp(print, ourTwoPreviousArguments))
  exit

then, parse LuaAST and compile in order, dropping each subsequent expression directly into a results array.
```

- We also want file hashing to skip unnecessarily compiling files which don't need to be recompiled.

## Formattable by design
- We would want an AST that implements the logic outlined in https://github.com/roblox-ts/roblox-ts/issues/62. That means `endStatement` should be a thing. `blockOpen` should be a thing, and we should have different kinds of `blockOpens`.

- We **may** want an AST that does not have parenthesized expression nodes. We could add parenthesis when we detect them necessary in the intermediary AST by operator precedence/associativity or when we think they make the code better looking (when developers don't have the precedence memorized, it can lead to ambiguous-looking expressions), or when they are required by the Lua grammar (e.g. `#{}` should be `#({})`). In order to do this in-order, we would need to use look-ahead.

## Debuggable by design
- Source maps are a must, so we can build a plugin which converts line numbers to typescript line numbers. It would be cool if roblox-ts could somehow show the roblox run-time error in its console with the right line number when testing in Studio.

- We should support a programmable `debugger` statement (with some options provided by us, but anybody who wants to could also make their own)
	- It could be nice if we supported an option to tag tables with what kind of table they are, for example, e.g. `({})[Symbol.__type] = "map"`, and then better information can be displayed about them when debugging. We would want to wrap all tables which come in from Lua APIs and all tables returned from libraries. Every other table could have these placed in at instantiation.

## Feature-rich by design
- Macros should be supported out of the box, with support for optimizing away unnecessary default values. This means we are going to want to have a special macro node which can be "copy and pasted" anywhere we need.
- We can also use this opportunity to fix a few of the remaining known bugs in the old system.

## Future proof by design
- We want an AST that mirrors the TS AST, but is smarter about what consititutes a single statement in Lua. For example, we should definitely have a `classDeclaration` node. When Roblox eventually adds a built-in class declaration syntax to Lua, we may or may not want to switch to that, or at least allow the option of doing so. Either way, there is no reason we need to completely lose the knowledge of what a classDeclaration is after the first compilation step. We should have `classDeclaration` have `methods`, `properties`, (and static of each). We don't want to get boxed in or require tons of refactoring for later additions to the Roblox Lua language.
    - For demonstration purposes, I would prefer to always allow the option to compile to regular-ish Lua in the playground. A toggle button would be nice.

