--You can merge the logging into the subuser class
--You could probably use the in built login features of postgres
--We need to get the plugins and get their type but for that we must be able to pass an array by string key
--We can redefine the Plugin field as a json object that way we can have keyed names
--However, why do we want this?
--We want this because its easier to ID using keyof in typescript allowing type strictness
--This is not an issue if we can identify the order

CREATE TYPE VerbosityLevel AS ENUM ('INFO', 'WARNING', 'ERROR', 'DEBUG');
CREATE TYPE ServerType AS ENUM ('default', 'horizon', 'outerRealm', 'outerRealm&horizon');
CREATE TYPE SubUserLog AS (
    timestamp TIMESTAMP,
    data      TEXT[],
    loglevel  VerbosityLevel
);
CREATE TABLE sub_users (
    id SERIAL PRIMARY KEY,
    owneruuid TEXT NOT NULL,
    name TEXT NOT NULL,
    logintoken TEXT NOT NULL,
    plugins JSON,
    state BOOLEAN DEFAULT FALSE,
    servertype ServerType,
    serverid INTEGER NOT NULL,
    logs SubUserLog[]
);

CREATE FUNCTION add_log(owner_uuid TEXT, cur_id INT, data TEXT[], loglevel VerbosityLevel)
RETURNS VOID AS $$
DECLARE
    cur_log SubUserLog;
    target_row sub_users;
BEGIN
    cur_log := row(now(), data, loglevel)::SubUserLog;

    SELECT * INTO target_row FROM sub_users WHERE id = cur_id;
    
    IF cardinality(target_row.logs) >= 256 THEN
        target_row.logs := target_row.logs[2:]; 
    END IF;

    target_row.logs := array_append(target_row.logs, cur_log);

    UPDATE sub_users SET logs = target_row.logs WHERE id = cur_id;
    PERFORM pg_notify('history_update', (
        jsonb_build_object('id', cur_id, 'owneruuid', owner_uuid) || to_jsonb(cur_log)
    )::TEXT);
    RETURN;
END $$ LANGUAGE PLPGSQL;
CREATE FUNCTION on_sub_user_update()
RETURNS TRIGGER AS $$
BEGIN
   PERFORM pg_notify('sub_user_update',array_to_json(ARRAY[OLD.*,NEW.*])::TEXT);
   RETURN NEW;
END $$ LANGUAGE PLPGSQL;
CREATE FUNCTION on_sub_user_delete()
RETURNS TRIGGER AS $$
BEGIN
   PERFORM pg_notify('sub_user_delete', '[' || OLD.id::TEXT || ',"' || OLD.owneruuid || '"]');
   RETURN NEW;
END $$ LANGUAGE PLPGSQL;

CREATE TRIGGER sub_user_update
BEFORE INSERT OR UPDATE ON sub_users
FOR EACH ROW
EXECUTE FUNCTION on_sub_user_update();

CREATE TRIGGER sub_user_delete
AFTER DELETE ON sub_users
FOR EACH ROW
EXECUTE FUNCTION on_sub_user_delete();

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    uuid TEXT NOT NULL DEFAULT uuidv7(),
    name TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    discordUserId TEXT,
    discordGuildId TEXT
);

CREATE OR REPLACE FUNCTION hash_user_password()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.passwordHash IS DISTINCT FROM OLD.passwordHash THEN
        NEW.passwordHash := crypt(NEW.passwordHash, gen_salt('bf', 12));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hash_password
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION hash_user_password();
