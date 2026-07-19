export default class IterableWeakMap<T extends WeakKey> {
  #weakMap = new WeakMap()
  #refSet = new Set()
  #registry = new FinalizationRegistry(this.#cleanup.bind(this))
  #cleanup(value : any) { this.#refSet.delete(value) }

  constructor(iterable? : any) {
    if(iterable)
      for(const [key, value] of iterable)
        this.set(key, value)
  }

  get(key : any) { return this.#weakMap.get(key)?.value }
  has(key : any) { return this.#weakMap.has(key) }
  set(key : any, value : T) {
    let entry = this.#weakMap.get(key)
    if(!entry) {
      const ref = new WeakRef(key)
      this.#registry.register(key, ref, key)
      entry = {ref, value: null}
      this.#weakMap.set(key, entry)
      this.#refSet.add(ref)
    }

    entry.value = value
    return this
  }
  delete(key : any) {
    const entry = this.#weakMap.get(key)
    if(!entry)
      return false

    this.#weakMap.delete(key)
    this.#refSet.delete(entry.ref)
    this.#registry.unregister(key)

    return true
  }
  clear() {
    for(const ref of this.#refSet as Set<WeakRef<T>>) {
      const el = ref.deref()
      if(el !== undefined)
        this.#registry.unregister(el)
    }

    this.#weakMap = new WeakMap()
    this.#refSet.clear()
  }
  *entries() {
    for(const ref of this.#refSet as Set<WeakRef<T>>) {
      const el = ref.deref()
      if(el !== undefined)
        yield [el, this.#weakMap.get(el).value]
    }
  }
  *keys() {
    for(const ref of this.#refSet as Set<WeakRef<T>>) {
      const el = ref.deref()
      if(el !== undefined)
        yield el
    }
  }
  *values() {
    for(const ref of this.#refSet as Set<WeakRef<T>>) {
      const el = ref.deref()
      if(el !== undefined)
        yield this.#weakMap.get(el).value
    }
  }
  forEach(callbackFn : (value : T, key? : any, thisType? : any) => void, thisArg? : any) {
    for(const [key, value] of this.entries())
      callbackFn.call(thisArg, value, key, this)
  }

  [Symbol.iterator]() { return this.entries() }
  get size() { return this.keys().reduce(i => i++, 0) }

  static get [Symbol.species]() { return IterableWeakMap }
}