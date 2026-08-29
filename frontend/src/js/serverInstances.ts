import type { IInstance } from '../../../types.ts'
export default await fetch(`/server`).then(a => a.json()) as IInstance[]