import type { IPlugin } from "../types.ts"

export const Test = {
    key : "test",
    filePath : "./test.ts",
    description: "",
    options: {
        numberr: { type: "Number", default : 2 },
        string: { type: "Toggle" }
    }
} as const satisfies IPlugin

export default [Test] as IPlugin[]