import { Client } from 'pg'

const client = await new Client({ port: 5436 }).connect() 
export default client