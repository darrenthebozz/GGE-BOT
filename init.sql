CREATE TYPE ServerType AS ENUM ('default', 'horizon', 'outerRealm', 'outerRealm&horizon');
CREATE TABLE sub_users (
    id SERIAL PRIMARY KEY,
    ownerUUID TEXT NOT NULL,
    name TEXT NOT NULL,
    loginToken TEXT NOT NULL,
    plugins JSON,
    state BOOLEAN DEFAULT FALSE,
    serverType ServerType,
    server INTEGER NOT NULL
);

CREATE FUNCTION on_sub_user_update()
RETURNS TRIGGER AS $$
BEGIN
   PERFORM pg_notify('sub_user_update',array_to_json(ARRAY[OLD.*,NEW.*])::TEXT);
   RETURN NEW;
END $$ LANGUAGE PLPGSQL;

CREATE FUNCTION on_sub_user_delete()
RETURNS TRIGGER AS $$
BEGIN
   PERFORM pg_notify('sub_user_delete', OLD.id::TEXT);
   EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident('log_history_' || OLD.id::text);
   RETURN NEW;
END $$ LANGUAGE PLPGSQL;

CREATE TRIGGER sub_user_update
AFTER UPDATE ON sub_users
FOR EACH ROW
EXECUTE FUNCTION on_sub_user_update();

CREATE TRIGGER sub_user_update2
AFTER INSERT ON sub_users
FOR EACH ROW
EXECUTE FUNCTION on_sub_user_update();

CREATE TRIGGER sub_user_update3
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

---history
CREATE TYPE VerbosityLevel AS ENUM ('INFO', 'WARNING', 'ERROR', 'DEBUG');