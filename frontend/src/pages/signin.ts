import type { APIRoute } from 'astro'
import client from '../components/database'

export const prerender = false
export const POST: APIRoute = async ({ clientAddress, request }) => {
  const { name, password } = await request.json();
  if (name == undefined || password == undefined) {
    console.warn(new Error(`[${clientAddress}] Undefined field/s`))
    return new Response(null, { status: 400 })
  }
    const { uuid, isvalid }: { uuid: string, isvalid: boolean } = await client.query(
      'SELECT uuid, (passwordHash = crypt($2, passwordHash)) AS isValid FROM users WHERE name=$1',
      [name, password]).then(({ rows }) => (rows[0] ?? { uuid : null, isvalid : false}, rows[0]))

    if (isvalid)
      return new Response(uuid as string, { status: 202 })
    else
      return new Response(null, { status: 401 })
}

