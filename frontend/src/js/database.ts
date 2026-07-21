import { Client } from 'pg'

const client = await new Client({ port: 5436, password : "password", user: "postgres" }).connect() 
export default client