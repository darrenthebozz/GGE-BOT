import plugins from '../plugins/index.ts'
const userDefault = {
    id: NaN,
    owneruuid: "",
    name: "",
    logintoken: "",
    plugins: {
        ...Object.fromEntries(plugins.map(({ key, options }) =>
            [key, Object.fromEntries([
                ...Object.entries(options).map(([key, option]) =>
                    [key, option.default]),
                    ["state", false]
                ])
            ])),
    },
    state: false,
    servertype: 'default',
    serverid: 1
}
export default userDefault