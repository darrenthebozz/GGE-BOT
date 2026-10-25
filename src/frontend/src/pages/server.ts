import {parseStringPromise} from 'xml2js'
import type { APIRoute } from "astro"
export const prerender = false
const cacheTime = 60 * 5
export const GET: APIRoute = async ctx => {
  const xml = await fetch(`https://empire-html5.goodgamestudios.com/config/network/1.xml`).then(e => e.text())
  const instances = await parseStringPromise(xml).then(({ network }) => 
    network.instances[0].instance!.map(e => ({
      value: Number(e['$'].value),
      name: String(e.instanceLocaId[0]),
      serverInstance: String(e.instanceName[0]),
      zone: String(e.zone[0]),
      server: String(e.server[0]),
    })))

  ctx.cache.set({
    maxAge: 1000 * cacheTime,
    tags: ['server'],
  })
  
  instances.push({
    value: 100 + 3,
    zone: "EmpireExSP_3",
    name: String("SP"),
    serverInstance: String("3"),
    server: "ep-live-mz-nw2-game.goodgamestudios.com"
  })

  return Response.json(instances, { headers: { 'Cache-Control': `public, max-age=${cacheTime}, immutable` }})
}