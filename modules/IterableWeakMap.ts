export default class IterableWeakMap<T extends WeakKey, J extends WeakKey> {
  #weakMap = new WeakMap<T, {ref : WeakRef<T>, value : J | null}>()
  #refSet = new Set()
  #registry = new FinalizationRegistry(this.#cleanup.bind(this))
  #cleanup(value : any) { this.#refSet.delete(value) }
  #size = 0

  constructor(iterable? : any) {
    if(iterable)
      for(const [key, value] of iterable)
        this.set(key, value)
  }

  get(key : T) { return this.#weakMap.get(key)?.value }
  has(key : T) { return this.#weakMap.has(key) }
  set(key : T, value : J) {
    let entry = this.#weakMap.get(key)
    if(!entry) {
      const ref = new WeakRef(key)
      this.#registry.register(key, ref, key)
      entry = {ref, value: null}
      this.#weakMap.set(key, entry)
      this.#refSet.add(ref)
    }
    
    this.#size++

    entry.value = value
    return this
  }
  delete(key : T) {
    const entry = this.#weakMap.get(key)
    if(!entry)
      return false

    this.#weakMap.delete(key)
    this.#refSet.delete(entry.ref)
    this.#registry.unregister(key)
    this.#size--

    return true
  }
  clear() {
    for(const ref of this.#refSet as Set<WeakRef<J>>) {
      const el = ref.deref()
      if(el !== undefined)
        this.#registry.unregister(el)
    }

    this.#weakMap = new WeakMap()
    this.#refSet.clear()
    this.#size = 0
  }
  *entries() {
    for(const ref of this.#refSet as Set<WeakRef<J>>) {
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
    for(const ref of this.#refSet as Set<WeakRef<J>>) {
      const el = ref.deref()
      if(el !== undefined)
        yield this.#weakMap.get(el).value
    }
  }
  forEach(callbackFn : (value : J, key? : T, thisType? : any) => void, thisArg? : any) {
    for(const [key, value] of this.entries())
      callbackFn.call(thisArg, value, key, this)
  }

  [Symbol.iterator]() { return this.entries() }
  get size() { return this.#size }

  static get [Symbol.species]() { return IterableWeakMap }
}