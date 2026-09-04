import { IPlugin } from "../types"

export const Test = {
    key : "test",
    filePath : "./test.ts",
    description: "",
    options: {
        numberr: { type: "Number" },
        string: { type: "Toggle" }
    }
} as const satisfies IPlugin

export default [Test]