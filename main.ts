import { tmpdir } from 'node:os'
import { EventEmitter } from 'node:events'
import { mkdir,  readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Worker } from 'node:worker_threads'

import EmbeddedPostgres from 'embedded-postgres'

console.debug = 0 ? console.debug : () => {}
const workingPath = join(tmpdir(), 'ggeBot')

console.log(workingPath)
try { await mkdir(workingPath) } catch (e) { console.debug(e) }
const databaseDir = join(workingPath, './db')
const pg = new EmbeddedPostgres({
    databaseDir,
    port: 5436,
    persistent: true,
    onLog: console.debug
})

let databaseInitialised = false

try { await pg.initialise(); databaseInitialised = true } catch (e) { console.debug(e) }
await pg.start()

const client = await pg.getPgClient().connect()
const subUserEvents = new EventEmitter()

if (databaseInitialised)
    await client.query(await readFile('./init.sql').then(o => o.toString()))

await client.query(`LISTEN sub_user_update`)

client.addListener('notification', ({ channel, payload }) => subUserEvents.emit(channel, payload))
subUserEvents.addListener('sub_user_update', payload => {
    const [oldUser, newUser] = JSON.parse(payload)
    const userChanges = oldUser ? Object.entries(oldUser).reduce((obj : any, [key, value]) =>
        (newUser[key] != value && (obj[key] = newUser[key]), obj), {}) : newUser

    if (userChanges.state == true)
        new Worker('./ggeBot.ts', { workerData: newUser.id })
})
client.query('Select * from sub_users').then(({ rows }) => rows.forEach(user =>
    user.state ? new Worker('./ggeBot.ts', { workerData: user.id }) : undefined))

export const getSubUser = (uuid : string) => client.query('Select * from sub_users WHERE ownerUUID=$1', [uuid]).then(({ rows }) => rows)
export const deleteSubUser = (uuid : string, { id } : any) => client.query('DELETE FROM sub_users WHERE ownerUUID=$1 AND id=$2', [uuid, id])
export const insertSubUser = (uuid : string, { name, loginToken, plugins, state, serverType, server } : any) =>
    client.query('INSERT INTO sub_users (name, loginToken, plugins, state, serverType, server, ownerUUID) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [name, loginToken, plugins, state, serverType, server, uuid])