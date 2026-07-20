export default interface {
    id: number,
    ownerUUID: string,
    name: string,
    loginToken: string,
    plugins: { [key: string]: { state: boolean } & any }
    state: boolean,
    serverType: 'default' | 'horizon' | 'outerRealm' | 'outerRealm&horizon'
    server: number
    [key: string]: any
}