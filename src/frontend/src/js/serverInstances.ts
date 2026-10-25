import type { IInstance } from '@bot/types.d.ts'
export default await fetch(`/server`).then(a => a.json()) as IInstance[]