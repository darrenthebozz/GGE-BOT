import type { APIRoute } from "astro"
export const prerender = false
const cacheTime = 60 * 5

export const GET: APIRoute = async ctx => {
  ctx.cache.set({
    maxAge: cacheTime,
    tags: ['lang'],
  })
  const url = new URL(ctx.request.url)
  const lang = url.pathname.replace("/lang/", "")
  const languages = (await (await fetch(`https://empire-html5.goodgamestudios.com/config/languages/version.json`)).json()).languages
  
  if(!languages[lang])
    return new Response(null, { status: 404 })
  
  return Response.json(
    await (await fetch(`https://empire-html5.goodgamestudios.com/config/languages/${languages[lang]}/${lang}.json`)).json(), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': `public, max-age=${cacheTime}, immutable`
      }
    })
}