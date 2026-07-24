import type { APIRoute } from 'astro'
import client from '../../../modules/database.js'

export const prerender = false
export const POST: APIRoute = async ({ clientAddress, request }) => {
  const { name, password } = await request.json()
  if (name == undefined || password == undefined) {
    console.warn(new Error(`[${clientAddress}] Undefined field/s`))
    return new Response(null, { status: 400 })
  }

  try { //The only reason this can throw is because of username restraint
    return new Response(await client.query('INSERT INTO Users (name, passwordHash) VALUES($1, $2) RETURNING uuid', [name, password]).then(row => row.rows[0].uuid) as string, { status: 201 })
  }
  catch (e) {
    console.debug(e)
    return new Response(null, { status: 409 })
  }
}
