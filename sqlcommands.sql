CREATE TYPE ServerType AS ENUM ('horizon', 'outerRealm');
CREATE TABLE IF NOT EXISTS subusers (
    id   SERIAL PRIMARY KEY,
    uuid TEXT NOT NULL,
    name TEXT NOT NULL,
    loginToken TEXT NOT NULL,
    plugins JSON,
    state BOOLEAN,
    externalEvent ExternalEvent,
    server INTEGER NOT NULL
    
);

CREATE OR REPLACE FUNCTION on_sub_user_update()
   RETURNS TRIGGER 
AS $$
BEGIN
   PERFORM pg_notify('sub_user_update',row_to_json(NEW.*)::TEXT);
   RETURN NULL;
END $$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION on_sub_user_delete()
   RETURNS TRIGGER 
AS $$
BEGIN
   PERFORM pg_notify('sub_user_delete', OLD.ID::TEXT);
   RETURN NULL;
END $$ LANGUAGE PLPGSQL;

CREATE OR REPLACE TRIGGER sub_user_update
AFTER UPDATE ON subusers
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION on_sub_user_update();
CREATE OR REPLACE TRIGGER sub_user_update2

AFTER INSERT ON subusers
FOR EACH ROW
EXECUTE FUNCTION on_sub_user_update();

CREATE OR REPLACE TRIGGER sub_user_update3
BEFORE DELETE ON subusers
FOR EACH ROW
EXECUTE FUNCTION on_sub_user_delete();

INSERT INTO subusers(uuid,name) VALUES('cheda', 'Cheese');
UPDATE subusers SET name = '2020-08-01' WHERE id = 1;

SELECT *
FROM subusers a
JOIN subusers b ON (a) IS NOT DISTINCT FROM (b);

SELECT id, any_value(*) FILTER (WHERE i
d > 1) FROM subusers GROUP BY id