import type { IPlugin } from "@bot/types"

export const Test = {
    key : "test",
    filePath : "./test.ts",
    description: "description",
    options: {
        numberr: { type: "Number", default : 2 },
        string: { type: "Toggle" }
    }
} satisfies IPlugin


export default [Test] as IPlugin[]