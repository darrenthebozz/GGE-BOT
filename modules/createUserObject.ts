import userDefaults from "./userDefaults.ts"
import type { IUser } from "../types.ts"

const dynamicObjectSearch = (obj: any, ...arr: any[]) =>
    arr.reduce((currentObj, key) => currentObj && currentObj[key] !== undefined ? currentObj[key] : undefined, obj)

function proxyHelper(origin: any, ...keys: any[]): ProxyHandler<any> {
    return {
        get(target: any, key: any) {
            if (typeof target[key] === 'object' && target[key] !== null) {
                let originRef = origin;
                keys.forEach((k, index) => {
                    if (!Object.prototype.hasOwnProperty.call(originRef, k))
                        originRef[k] = {}

                    originRef = originRef[k]

                    const searchKeys = keys.slice(0, index + 1)
                    const a = dynamicObjectSearch(Object.getPrototypeOf(origin), ...searchKeys)
                    if (a && typeof a === 'object')
                        Object.setPrototypeOf(originRef, a)
                })
                
                if (Object.prototype.hasOwnProperty.call(originRef, key) && Object.getPrototypeOf(target[key]) === Object.prototype)
                    Object.setPrototypeOf(target[key], Object.getPrototypeOf(target)[key])

                return new Proxy(target[key], proxyHelper(origin, ...keys, key))
            }
            return target[key]
        },
        set(target: any, key: any, value: any) {
            let originRef = origin;

            keys.forEach((k, index) => {
                if (!Object.prototype.hasOwnProperty.call(originRef, k))
                    originRef[k] = {}

                originRef = originRef[k]

                const searchKeys = keys.slice(0, index + 1)
                const a = dynamicObjectSearch(Object.getPrototypeOf(origin), ...searchKeys)
                if (a && typeof a === 'object')
                    Object.setPrototypeOf(originRef, a)
            })

            if (typeof originRef[key] === 'object' && typeof value === 'object' && originRef[key] !== null)
                Object.setPrototypeOf(value, Object.getPrototypeOf(target[key]))

            originRef[key] = value

            return true
        },
        deleteProperty(target: any, key: any) {
            let originRef = origin
            let previousRef = null
            let previousKey = null

            for (const k of keys) {
                if (!Object.prototype.hasOwnProperty.call(originRef, k))
                    return true
                
                previousRef = originRef 
                previousKey = k 
                originRef = originRef[k]
            }

            if (Object.prototype.hasOwnProperty.call(originRef, key))
                delete originRef[key]
                
            if (previousRef && previousKey && Object.keys(previousRef[previousKey]).length == 0)
                delete previousRef[previousKey]

            return true
        }
    }
}
export default (user? : any) => {
    user ??= {}
    
    Object.setPrototypeOf(user, userDefaults)
    return new Proxy(user, proxyHelper(user)) as IUser
}