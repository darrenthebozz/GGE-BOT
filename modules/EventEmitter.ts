import { EventEmitter } from "node:events"

interface NodeEventEmitter<T> extends Omit<EventEmitter, 'on' | 'emit' | 'off'> {
  on<K extends keyof T>(event: K, listener: (...arg: Array<T[K]>) => void): this;
  off<K extends keyof T>(event: K, listener: (...arg: Array<T[K]>) => void): this;
  
  emit<K extends keyof T>(event: K, ...arg: Array<T[K]> ): boolean;
  emit<K extends keyof T>(event: K, ...arg: Array<T[K]>): boolean;
}
type a<T> = T extends NodeEventEmitter<T> ? number : string
export default EventEmitter as (new<T = { [key : string] : unknown }> () => NodeEventEmitter<T>)