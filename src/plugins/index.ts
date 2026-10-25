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
//as const
let i = 0
const test = Array<typeof Test>(4).fill(Test).map(e=> structuredClone(e))
test.forEach(e => e.key = `${e.key}${i++}`)
export default test as IPlugin[]