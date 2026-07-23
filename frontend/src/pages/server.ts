import type { APIRoute } from "astro"
export const prerender = false
const cacheTime = 60 * 5
export const GET: APIRoute = async ctx => {
  ctx.cache.set({
    maxAge: 1000 * cacheTime,
    tags: ['server'],
  })
  const xml = await (await fetch(`https://empire-html5.goodgamestudios.com/config/network/1.xml`)).text()
  return new Response(xml, {
    headers: { 
      'Content-Type': 'application/xml',
      'Cache-Control': `public, max-age=${cacheTime}, immutable`
    }
  })
}