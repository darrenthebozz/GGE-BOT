import type { IPlugin } from "../types.ts"

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
const test = Array<typeof Test>(100).fill(Test).map(e=> structuredClone(e))

//.map(e => (, e))
test.forEach(e => e.key = `${e.key}${i++}`)
console.log(test)
export default test as IPlugin[]