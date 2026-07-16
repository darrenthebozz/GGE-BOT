import { tmpdir } from 'node:os'
import { EventEmitter } from 'node:events'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import EmbeddedPostgres from 'embedded-postgres'

console.debug = 0 ? console.debug : () => { }
const workingPath = join(tmpdir(), 'ggeBot')

console.log(workingPath)
try { await mkdir(workingPath) } catch (e) { console.debug(e) }

const pg = new EmbeddedPostgres({
    databaseDir: join(workingPath, './db'),
    port: 5436,
    persistent: true,
    onLog: console.debug
})

try {
    await pg.initialise()
    await client.query(`
CREATE TYPE ServerType AS ENUM ('default', 'horizon', 'outerRealm');
CREATE TABLE sub_users (
    id   SERIAL PRIMARY KEY,
    ownerUUID TEXT NOT NULL,
    name TEXT NOT NULL,
    loginToken TEXT NOT NULL,
    plugins JSON,
    state BOOLEAN,
    serverType ServerType,
    server INTEGER NOT NULL
);

CREATE FUNCTION on_sub_user_update()
   RETURNS TRIGGER 
AS $$
BEGIN
   PERFORM pg_notify('sub_user_update',array_to_json(ARRAY[OLD.*,NEW.*])::TEXT);
   RETURN NEW;
END $$ LANGUAGE PLPGSQL;

CREATE FUNCTION on_sub_user_delete()
   RETURNS TRIGGER 
AS $$
BEGIN
   PERFORM pg_notify('sub_user_delete', OLD.id::TEXT);
   RETURN NEW;
END $$ LANGUAGE PLPGSQL;

CREATE TRIGGER sub_user_update
AFTER UPDATE ON sub_users
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION on_sub_user_update();

CREATE TRIGGER sub_user_update2
AFTER INSERT ON sub_users
FOR EACH ROW
EXECUTE FUNCTION on_sub_user_update();

CREATE TRIGGER sub_user_update3
AFTER DELETE ON sub_users
FOR EACH ROW
EXECUTE FUNCTION on_sub_user_delete();`)
} catch (e) { console.debug(e) }

await pg.start()

const client = await pg.getPgClient().connect()
const subUserEvents = new EventEmitter()

await client.query(`LISTEN sub_user_update`)
client.addListener('notification', ({ channel, payload }) => subUserEvents.emit(channel, payload))
subUserEvents.addListener('sub_user_update', payload => {
    const [oldUser, newUser] = JSON.parse(payload)
    const userChanges = oldUser ? Object.entries(oldUser).reduce((obj, [key, value]) =>
        (newUser[key] != value && (obj[key] = newUser[key]), obj), {}) : newUser

    if (userChanges.state == true)
        new Worker('./ggeBot.js', { workerData: { uuid, newUser } })
})
client.query('Select * from sub_users').then(({ rows }) => row.state ? startBot(uuid, newUser) : undefined)

export const getSubUser = uuid =>
    client.query('Select * from sub_users WHERE ownerUUID=$1', [uuid]).then(({ rows }) => rows)
export const deleteSubUser = (uuid, { id }) =>
    client.query('DELETE FROM sub_users WHERE ownerUUID=$1 AND id=$2', [uuid, id])
export const insertSubUser = (uuid, { name, loginToken, plugins, state, serverType, server }) =>
    client.query('INSERT INTO sub_users (name, loginToken, plugins, state, serverType, server, ownerUUID) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [name, loginToken, plugins, state, serverType, server, uuid])
