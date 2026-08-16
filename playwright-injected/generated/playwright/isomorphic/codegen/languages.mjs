import { CSharpLanguageGenerator } from "./csharp.mjs";
import { JavaLanguageGenerator } from "./java.mjs";
import { JavaScriptLanguageGenerator } from "./javascript.mjs";
import { JsonlLanguageGenerator } from "./jsonl.mjs";
import { PythonLanguageGenerator } from "./python.mjs";
function languageSet() {
  return /* @__PURE__ */ new Set([
    new JavaScriptLanguageGenerator(
      /* isPlaywrightTest */
      true
    ),
    new JavaScriptLanguageGenerator(
      /* isPlaywrightTest */
      false
    ),
    new PythonLanguageGenerator(
      /* isAsync */
      false,
      /* isPytest */
      true
    ),
    new PythonLanguageGenerator(
      /* isAsync */
      false,
      /* isPytest */
      false
    ),
    new PythonLanguageGenerator(
      /* isAsync */
      true,
      /* isPytest */
      false
    ),
    new CSharpLanguageGenerator("mstest"),
    new CSharpLanguageGenerator("nunit"),
    new CSharpLanguageGenerator("xunit"),
    new CSharpLanguageGenerator("library"),
    new JavaLanguageGenerator("junit"),
    new JavaLanguageGenerator("library"),
    new JsonlLanguageGenerator()
  ]);
}
export {
  languageSet
};

//# sourceMappingURL=languages.mjs.map
