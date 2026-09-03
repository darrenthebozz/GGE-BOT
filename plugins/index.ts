import { PluginOptionType, IPlugin } from "../types"

export default [{
    key : "test",
    filePath: "./test.ts",
    description: "",
    options: {
        numberr: {
            type: PluginOptionType.Number
        }
    }
}] satisfies IPlugin[]