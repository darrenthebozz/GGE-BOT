import { Client } from 'pg'
export default await new Client({ port: 5436, password : "password", user: "postgres" }).connect() 