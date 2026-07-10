import EmbeddedPostgres from 'embedded-postgres';

console.debug = 1 ? console.debug : () => {} 

// Create the object
const pg = new EmbeddedPostgres({
    databaseDir: './db',
    port: 5436,
    persistent: true,
    onLog: console.debug
});

// Create the cluster config files
try {
    await pg.initialise();
} catch (e) {
    console.debug(e)
}

// Start the server
await pg.start();

// Initialize a node-postgres client
const client = await pg.getPgClient().connect();

// client.query("CREATE TABLE IF NOT EXISTS users")

client.addListener("notification", msg => {
    console.log("party")
    console.log(msg)
})
await client.query("LISTEN channel");
await client.query("NOTIFY channel");
// await client.end();
// Stop the server
// await pg.stop();