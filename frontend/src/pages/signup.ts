import type { APIRoute } from 'astro'
import client from '../components/database'

export const prerender = false
export const GET: APIRoute = async ({params : { name, password }}) => {
  try { //The only reason this can throw is because of username restraint
    return new Response(await client.query('INSERT INTO Users (name, passwordHash) VALUES($1, $2)', [name, password]).then(row => row.rows[0].uuid) as string, {status: 201})
  }
  catch(e) {
    console.debug(e)
    return new Response(null, { status: 409 })
  }
}
