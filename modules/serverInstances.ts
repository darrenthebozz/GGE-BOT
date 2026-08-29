import type {IBotConfig, IInstance} from '../types.ts'

const { port } = await import("node:worker_threads").then(e => e?.workerData as IBotConfig | undefined)
    .catch(console.debug) ?? { port : "" }

export default await fetch(`/server:${port}`).then(a => a.json()) as IInstance[]