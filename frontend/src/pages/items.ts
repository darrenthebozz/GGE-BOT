import type { APIRoute } from "astro";
export const prerender = false;
const cacheTime = 60 * 5

export const GET: APIRoute = async ctx => {
  ctx.cache.set({
    maxAge: 1000 * cacheTime,
    tags: ['items'],
  });

  const itemsVerion = await (await fetch('https://empire-html5.goodgamestudios.com/default/items/ItemsVersion.properties')).text()
  const version = itemsVerion.match(new RegExp(/(?!.*=).*/))?.[0]
  if(version == undefined)
    throw new Error("Could not get items.json version")

  const items = await (await fetch(`https://empire-html5.goodgamestudios.com/default/items/items_v${version}.json`)).json()

  return Response.json(items, {
    headers: {
      'Cache-Control': `public, max-age=${cacheTime}, immutable`
    }
  })
};