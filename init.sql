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
EXECUTE FUNCTION on_sub_user_delete();