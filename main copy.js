import { tmpdir } from 'node:os'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import EmbeddedPostgres from 'embedded-postgres'
import { EventEmitter } from 'node:events'

console.debug = 0 ? console.debug : () => { }

const workingPath = join(tmpdir(), 'ggeBot')
console.log(workingPath)
try {
    await mkdir(workingPath)
} catch (e) {
    console.debug(e)
}

const pg = new EmbeddedPostgres({
    databaseDir: join(workingPath, './db'),
    port: 5436,
    persistent: true,
    onLog: console.debug
})

let shouldSetupDatabase = false
try {
    await pg.initialise()
    shouldSetupDatabase = true
} catch (e) {
    console.debug(e)
}

await pg.start()
export const client = await pg.getPgClient().connect()

if (shouldSetupDatabase) {
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
   PERFORM pg_notify('sub_user_update',row_to_json(NEW.*)::TEXT);
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
}

export const getAllSubUsers = uuid =>
    client.query('Select * from sub_users').then(({rows}) => rows)
export const getSubUser = uuid =>
    client.query('Select * from sub_users WHERE ownerUUID=$1', [uuid]).then(({rows}) => rows)
export const deleteSubUser = (uuid, { id }) =>
    client.query('DELETE FROM sub_users WHERE ownerUUID=$1 AND id=$2', [uuid, id])
export const insertSubUser = (uuid, { name, loginToken, plugins, state, serverType, server, ownerUUID }) =>
    client.query('INSERT INTO sub_users (name, loginToken, plugins, state, serverType, server, ownerUUID) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [name, loginToken, plugins, state, serverType, server, uuid])

await client.query(`
    LISTEN sub_user_delete;
    LISTEN sub_user_update`)

const subUserEvents = new EventEmitter()

client.addListener('notification', ({ channel, payload }) => subUserEvents.emit(channel, payload))

subUserEvents.addListener('sub_user_update', payload => {
    const user = JSON.stringify(payload)
})

subUserEvents.addListener('sub_user_delete', payload => {
    console.log(payload)
})

//const { getSubUser, deleteSubUser, insertSubUser, client } = await import("./main copy.js");