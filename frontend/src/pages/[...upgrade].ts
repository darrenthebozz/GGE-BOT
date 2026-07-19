import type { APIRoute } from "astro"
 
export const prerender = false
const cacheTime = 60 * 5

export const UPGRADE: APIRoute = async ctx => {
  return Response.json(undefined, {
    headers: {
      'Cache-Control': `public, max-age=${cacheTime}, immutable`
    }
  })
};