const servers = new DOMParser().parseFromString(await fetch("/server").then(a => a.text()), "application/xml")

export default Array.from(servers.getElementsByTagName("instance") ?? []).map(obj => {
    const nodes = Array.from(obj.childNodes)

    const instanceLocaId = nodes.find(({ nodeName }) => nodeName == "instanceLocaId")?.childNodes[0].nodeValue ?? ""
    const instanceName = nodes.find(({ nodeName }) => nodeName == "instanceName")?.childNodes[0].nodeValue ?? ""

    return {
        value: obj.getAttribute("value") ?? "",
        name: instanceLocaId,
        serverInstance : instanceName,
        zone: nodes.find(({ nodeName }) => nodeName == "zone")?.childNodes[0].nodeValue ?? "",
        server: nodes.find(({ nodeName }) => nodeName == "server")?.childNodes[0].nodeValue ?? "",
    }
})