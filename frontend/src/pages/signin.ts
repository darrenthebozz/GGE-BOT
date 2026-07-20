import type { APIRoute } from 'astro'
import client from '../components/database'

export const prerender = false
export const GET: APIRoute = async ({ clientAddress, params: { name, password } }) => {
  if (name == undefined || password == undefined) {
    console.warn(new Error(`[${clientAddress}] Undefined field/s`))
    return new Response(null, { status: 400 })
  }
  try {
    const { uuid, isValid }: { uuid: string, isValid: boolean } = await client.query('SELECT uuid, (passwordHash = crypt($2, passwordHash)) AS isValid FROM users WHERE name=$1',
      [name, password]).then(({ rows }) => rows[0])

    if (isValid)
      return new Response(uuid as string, { status: 202 })
    else
      return new Response(null, { status: 401 })
  }
  catch (e) {
    console.warn(e)
    return new Response(null, { status: 400 })
  }
}

