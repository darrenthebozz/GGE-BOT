import type { APIRoute } from 'astro'
try {
  var { sharp } = await import('sharp')
}
catch(e) {
  console.warn(e)
}
export const prerender = false

const cacheTime = 60 * 60 * 5

export const GET: APIRoute = async ctx => {
  ctx.cache.set({
    maxAge: 1000 * cacheTime,
    tags: ['ggeimg'],
  })
  const imgPath = (new URL(ctx.request.url)).pathname.replace("/ggeimg/", "")
  const img = await (await fetch(`https://empire-html5.goodgamestudios.com/default/assets/${imgPath}`)).arrayBuffer()
  try {
    return new Response(new Uint8Array(await sharp(img).resize(32).toBuffer()), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': `public, max-age=${cacheTime}, immutable`
      }
    })
  }
  catch (e) {
    console.warn(e)

    return new Response(img, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': `public, max-age=${cacheTime}, immutable`
      }
    })
  }
}
