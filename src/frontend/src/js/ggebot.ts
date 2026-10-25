class GAAAreaInfo {
    type: number
    x: number
    y: number
    extraData: Array<any>
    timeSinceRequest: number
    constructor(o: any) {
        this.type = Number(o[0])
        this.x = Number(o[1])
        this.y = Number(o[2])
        this.extraData = Array.from(o).toSpliced(0, 3)
        this.timeSinceRequest = Number(Date.now())
    }
}
class CastleAreaInfo {
    areaInfo: GAAAreaInfo
    id: number
    abandonOutpostTime: number
    abandonOutpostTimeCooldown: number
    kingdomID: number
    constructor(e: any, kingdomID: any) {
        this.areaInfo = new GAAAreaInfo(e.AI)
        this.id = Number(this.areaInfo.extraData[0])
        this.abandonOutpostTime = Number(e.AOT)
        this.abandonOutpostTimeCooldown = Number(e.TA)
        this.kingdomID = kingdomID
    }
}
export default function login(username: string, password: string, gameServer: string, gameURL: string) {
    const xtHandler = new EventTarget()
    const events = new EventTarget()
    const ws = new WebSocket(`wss://${gameURL}`)
    const sendXT = (cmdName: string, paramObj: string) =>
        ws.send(`%xt%${gameServer}%${cmdName}%1%${paramObj}%`)
    ws.onopen = () => ws.send('<msg t="sys"><body action="verChk" r="0"><ver v="166"/></body></msg>')
    ws.addEventListener("close", e => events.dispatchEvent(new CustomEvent("CLOSEDEARLY", { detail: e })))
    ws.addEventListener("message", async ({ data: message }) => {
        message = await message.text()
        if (message.charAt(0) == "%") {
            let [, , cmd, , r, obj] = message.split("%")
            try { obj = JSON.parse(obj) }
            catch { }

            if(cmd == "gbd")
                for (const [key, value] of Object.entries(obj))
                    xtHandler.dispatchEvent(new CustomEvent(key, { detail: { obj : value, r : 0 } }))
            else
                xtHandler.dispatchEvent(new CustomEvent(cmd, { detail: { obj, r } }))
        }

        else if (message[0] == "<") {
            switch (message) {
                case "<msg t='sys'><body action='apiOK' r='0'></body></msg>":
                    ws.send(`<msg t="sys"><body action="login" r="0"><login z="${gameServer}"><nick><![CDATA[]]></nick><pword><![CDATA[undefined%en%0]]></pword></login></body></msg>`)
                    break
                case "<msg t='sys'><body action='joinOK' r='1'><pid id='0'/><vars /><uLs r='1'></uLs></body></msg>":
                    ws.send('<msg t="sys"><body action="roundTrip" r="1"></body></msg>')
                    sendXT("vck", `undefined%web-html5%<RoundHouseKick>%${(Math.random() * Number.MAX_VALUE).toFixed()}`)
                    break
            }
        }
    })
    const retry = () => sendXT("lli", JSON.stringify({
            CONM: 212,
            RTM: 25,
            ID: 0,
            PL: 1,
            NOM: username,
            PW: password,
            LT: null,
            LANG: "en",
            DID: "0",
            AID: "1745592024940879420",
            KID: "",
            REF: "https://empire.goodgamestudios.com",
            GCI: "",
            SID: 9,
            PLFID: 1
        }))
    xtHandler.addEventListener("vck", retry)
    xtHandler.addEventListener("rlu", () => ws.send('<msg t="sys"><body action="autoJoin" r="-1"></body></msg>'))
    xtHandler.addEventListener("lli", () => {
        const timer = setInterval(() => {
            if(ws.readyState == ws.CLOSED)
                return clearInterval(timer)

            sendXT("pin", "<RoundHouseKick>")
        }, 1000 * 60)
    }, { once: true})
    xtHandler.addEventListener("lli", ({ detail: { obj, r } }: CustomEventInit<any>) => {
        switch(r) {
            case 453:
            setTimeout(retry, obj.CD * 1000)
            events.dispatchEvent(new CustomEvent("TIMEOUT", { detail: obj.CD }))
            break
            case 27:
            setTimeout(retry, obj.RS * 1000)
            events.dispatchEvent(new CustomEvent("TIMEOUT", { detail: obj.RS }))
            break
            default:
            events.dispatchEvent(new CustomEvent("ERROR", { detail: { obj, r } }))
            ws.close(3000, "An error has occurred")
            case 0:
        }
    })

    const allianceInfo = new Promise(resolve => xtHandler.addEventListener("gal", ({ detail: { obj } }: CustomEventInit<any>) => {
        resolve({
            id : Number(obj.AID),
            rank : Number(obj.R),
            name : String(obj.N),
            fame : Number(obj.ACF),
            searchingForPlayers : Boolean(obj.SA)
        })
        console.log("resolved alliance info")
    }))
    
    const level = new Promise(resolve => xtHandler.addEventListener("gxp", ({ detail: { obj } }: CustomEventInit<any>) => {
        resolve(obj.LVL + obj.LL)
        console.log("resolved level")
    })) as Promise<number>
    const userInfo = new Promise(resolve => xtHandler.addEventListener("gpi", ({ detail: { obj } }: CustomEventInit<any>) => {
        resolve({
            userID: Number(obj.UID),
            playerID: Number(obj.PID),
            name: String(obj.PN),
            email: String(obj.E),
            verifiedEmail: Boolean(obj.V),
            acceptedTOS: Boolean(obj.CTAC),
            isCheater: Boolean(obj.CL)
        })
        console.log("userInfo")
    }))
    const castles = new Promise(resolve => xtHandler.addEventListener("gcl", ({ detail: { obj } }: CustomEventInit<any>) => {
        resolve(Array.from(obj.C)
            .map((a: any) => Array.from(a.AI).map(e => new CastleAreaInfo(e, a.KID))).flat())
            console.log("resolved castles")
    })) as Promise<Array<CastleAreaInfo>>

    xtHandler.addEventListener("slt", ({ detail: { obj } }: CustomEventInit<any>) => {
        ws.close()
        events.dispatchEvent(new CustomEvent("LOGGEDIN", { detail : obj.LT }))
    })

    return events
}