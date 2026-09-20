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
--  FOR YOUR LIFE DONT EVEN TRY AND USE DEFAULT WTF 
    logs SubUserLog[]
);

CREATE FUNCTION add_log(owner_uuid TEXT, cur_id INT, data TEXT[], loglevel VerbosityLevel)
RETURNS VOID AS $$
DECLARE
    v_logs SubUserLog[];
    v_timestamp TEXT := now();
BEGIN
    SELECT logs INTO v_logs FROM sub_users WHERE id = cur_id;
    
    IF cardinality(v_logs) >= 256 THEN
        v_logs := v_logs[2:array_upper(v_logs, 1)]; 
    END IF;

    v_logs := array_append(v_logs, row(v_timestamp,data,loglevel)::SubUserLog);

    UPDATE sub_users SET logs = v_logs WHERE id = cur_id;
    PERFORM pg_notify('history_update', jsonb_build_object(
        'id', cur_id, 
        'owneruuid', owner_uuid,
        'timestamp', v_timestamp,
        'data', data,
        'loglevel', loglevel
    )::TEXT);
    RETURN;
END $$ LANGUAGE PLPGSQL;
CREATE FUNCTION on_sub_user_update()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('sub_user_update', jsonb_build_array(
        jsonb_build_object(
            'id', OLD.id, 
            'owneruuid', OLD.owneruuid,
            'name', OLD.name,
            'logintoken', OLD.logintoken,
            'plugins', OLD.plugins,
            'state', OLD.state,
            'servertype', OLD.servertype,
            'serverid', OLD.serverid),
        jsonb_build_object(
            'id', NEW.id, 
            'owneruuid', NEW.owneruuid,
            'name', NEW.name,
            'logintoken', NEW.logintoken,
            'plugins', NEW.plugins,
            'state', NEW.state,
            'servertype', NEW.servertype,
            'serverid', NEW.serverid))::TEXT);
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
