import type { IInstance } from '../../../types.d.ts'
export default await fetch(`/server`).then(a => a.json()) as IInstance[]