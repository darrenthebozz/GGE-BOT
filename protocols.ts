import { parentPort } from "node:worker_threads"
import EventEmitter from "node:events"
import NodeCache from "node-cache"
import { RateLimiter } from "limiter"
import { waitForResult, sendXT, xtHandler, events } from "./ggeBot.js"
import currencies from "./items/currencies.json"
import ActionType from "./actions.json"
import units from "./items/units.json"
import effects from "./items/effects.json"
import effectTypes from "./items/effecttypes.json"
import effectCaps from "./items/effectCaps.json"
import generalSkills from "./items/generalSkills.json"
import relicEffects from "./items/relicEffects.json"
import equipmentEffects from "./items/equipment_effects.json"

const myCache = new NodeCache({useClones : false})

let generals = []

xtHandler.on("gie", obj => generals = obj.G)

function spiralCoordinates(n : Number) {
    if (n === 0) return { x: 0, y: 0 }

    const k = Math.ceil((Math.sqrt(n + 1) - 1) / 2)
    const layerStart = (2 * (k - 1) + 1) ** 2
    const offset = n - layerStart
    const sideLength = 2 * k
    const side = Math.floor(offset / sideLength)
    const posInSide = offset % sideLength

    let x, y

    switch (side) {
        case 0:
            x = k
            y = -k + 1 + posInSide
            break
        case 1:
            x = k - 1 - posInSide
            y = k
            break
        case 2:
            x = -k
            y = k - 1 - posInSide
            break
        case 3:
            x = -k + 1 + posInSide
            y = -k
            break
    }

    return { x, y }
}
const AreaType = Object.freeze({
    barron: 2,
    outpost: 4,
    externalKingdom: 12,
    mainCastle: 1,
    alienCastle: 21,
    bloodcrowCastle: 34,
    nomadCamp: 27,
    daimyoCastle: 37,
    stormIsland: 24,
    samCamp: 29,
    beriCamp: 30,
    watchTower: 17,
    capital: 3,
    fortress : 11,
    beriCastle : 15,
    stormTower : 25,
    khanCamp : 35
})
const HighscoreType = Object.freeze({
    honour: 5
})

const map = {}
const registry = new FinalizationRegistry((key : any) => delete map[key])
/**
 * @param {GAAAreaInfo} AI 
 * @param {Number} kingdomID
 */
const MapObject = (AI : GAAAreaInfo, kingdomID : Number) => {
    if(kingdomID == undefined)
        return AI
    
    const key = `${kingdomID}_${AI.x}_${AI.y}`
    /** @type {GAAAreaInfo} */
    const obj = map[key]?.deref()
    if(!obj) {
        map[key] = new WeakRef(AI)
        registry.register(AI, key)
        return AI
    }

    Object.assign(obj, AI)
    
    return obj
}


const KingdomSkipType = Object.freeze({
    sendResource: 2,
    sendTroops: 1,

    1: "sendTroops",
    2: "sendResource"
});
const KingdomID = Object.freeze({
    greatEmpire: 0,
    burningSands: 1,
    everWinterGlacier: 2,
    firePeaks: 3,
    stormIslands: 4,
    berimond: 10,

    0: "Great Empire",
    1: "Burning Sands",
    2: "EverWinter Glacier",
    3: "Fire Peaks",
    4: "Storm Islands",
    10: "Berimond"
});

const OwnedCastlePositionList = o =>
    ({ kingdomID: o[0], id: o[1], X: o[2], Y: o[3], type: o[4] })

const Crest = o => ({
    backgroundType: Number(o.BGT),
    backgroundColor1: Number(o.BGC1),
    backgroundColor2: Number(o.BGC2),
    symbolPositionType: Number(o.SPT),
    symbolType1: Number(o.S1),
    symbolColor1: Number(o.SC1),
    symbolType2: Number(o.S2),
    symbolColor2: Number(o.SC2),
    isSet: Boolean(o.IS)
})
const AllianceCrest = o => (o ? {
    layoutID: Number(o.ACCA ? o.ACCA.ACLI : o.ACFB?.ACLI),
    colorID: Array.from(o.ACCA ? o.ACCA.ACCS : o.ACFB?.ACCS).map(Number)
} : undefined)
class GAAAreaInfo {
    type : Number
    x : number
    y : number
    extraData : any[]
    timeSinceRequest : number
    constructor(o : Array<any>) {
        this.type = o[0]
        this.x = o[1]
        this.y = o[2]
        this.extraData = o.toSpliced(0, 3)
        this.timeSinceRequest = Date.now()
    }
}
const FactionData = o => ({
    mainCampID: Number(o.MC),
    factionID: Number(o.FID),
    factionTitleID: Number(o.TID),
    remainingNoobTime: Number(o.NS),
    protectionStatus: Number(o.PMS),
    protectionTime: Number(o.PMT),
    specialCampID: Number(o.SPC)
})

const ServerUserAttackProtection = o => ({
    kingdomID: Number(o?.KID),
    remainingNoobTime: Number(o?.NS),
    factionProtectionStatus: Number(o?.PMS),
    factionProtectionEndTime: Number(o?.PMT)
})

class OwnerInfo {
    constructor(o) {
        this.ownerID = Number(o.OID)
        this.isDummy = Boolean(o.DUM)
        this.name = String(o.N)
        this.crest = o.E ? Crest(o.E) : undefined
        this.level = Number(o.L + o.LL)
        this.honour = Number(o.H)
        this.achievementPoints = Number(o.AVP)
        this.gloryPoints = Number(o.CF)
        this.highestGloryPoints = Number(o.HF)
        this.titlePrefix = Number(o.PRE)
        this.titleSuffix = Number(o.SUF)
        this.TOPX = Number(o.TOPX)
        this.mightPoints = Number(o.MP)
        this.isRuin = Boolean(o.R)
        this.allianceID = Number(o.AID)
        this.allianceRank = Number(o.AR)
        this.allianceName = String(o.AN)
        this.allianceEmblem = AllianceCrest(o.aee)
        this.remainingPeaceTime = Number(o.RPT)
        this.castlePositionList = o.AP ? Array.from(o.AP).map(OwnedCastlePositionList) : undefined
        this.villagePositionList = o.VP ? Array.from(o.VP).map(OwnedCastlePositionList) : undefined
        this.isSearchingForAlliance = Boolean(o.SA)
        this.hasPremiumFlag = Boolean(o.PF)
        this.remainingRelocationTime = Number(o.RRD)
        this.islandTitleID = Number(o.TI)
        this.remainingNoobTime = Number(o.RNP)
        this.factionID = o.FN ? FactionData(o.FN) : undefined
    }
}

class ServerGetAreaInfo {
    constructor(o) {
        this.kingdomID = Number(o?.KID)
        this.userAttackProtection = ServerUserAttackProtection(o?.uap)
        this.ownerInfo = o?.OI ? Array.from(o?.OI).map(o => new OwnerInfo(o)) : undefined
        this.areaInfo = o?.AI ? Array.from(o?.AI).map(o => MapObject(new GAAAreaInfo(o), this.kingdomID)) : undefined
        this.result = Number(o.result)
    }
}
/**
 * 
 * @param {Number} x 
 * @param {Number} y 
 * @param {Number} kingdomID
 */
async function clientPreSpyInfo(x, y, kingdomID, useCache) {
    useCache ??= true
    /** @type {GAAAreaInfo} */
    const cachedMapData = map[`${kingdomID}_${x}_${y}`]?.deref()
    if(useCache && cachedMapData && (Date.now() - cachedMapData.timeSinceRequest) <= 1000 * 10) {
        console.debug("Using cached results")
        return {areaInfo: cachedMapData, result: 0}
    }

    await sendXT("ssi", JSON.stringify({ TX: x, TY: y, KID: kingdomID }))
    const [obj, result] = await waitForResult("ssi", 1000 * 10, (obj, result) =>
        result != 0 ||
        obj?.gaa?.KID == kingdomID &&
        obj?.TX == x &&
        obj?.TY == y)

    if (result != 0)
        return { result }

    return { areaInfo: new ServerGetAreaInfo(obj.gaa, result).areaInfo[0], result: 0 }
}
async function clientSkipTarget(type, x, y, kingdomID, skip) {
    await sendXT("msd", JSON.stringify({ X: x, Y: y, MID: -1, NID: -1, MST: skip, KID: `${kingdomID}` }))
    let [obj, result] = await waitForResult("msd", 7000, (obj, result) => result != 0 || 
        obj.AI[0] == type || obj.AI[1] == x || obj.AI[2] == y)

    if (result != 0)
        return { result }
    
    return { areaInfo: MapObject(new GAAAreaInfo(obj.AI), kingdomID), result: 0 }
}
async function clientGetNextMapObject(type, kingdomID) {
    await sendXT("fnm", JSON.stringify({ T: type, KID: kingdomID, LMIN: -1, LMAX: -1, NID: -801 }))
    
    const [obj, result] = (await waitForResult("fnm", 8500, (obj, result) => {
        if (result != 0)
            return true

        if (obj.gaa.KID != kingdomID)
            return false

        if (obj.gaa.AI[0][0] != type)
            return false

        return true
    }))

    if (result != 0)
        return { result }
    
    return { areaInfo: new ServerGetAreaInfo(obj.gaa, result).areaInfo[0], result: 0 }
}

const limiter = new RateLimiter({ tokensPerInterval: 5, interval: "second" })
/**
 * @type { CastleInfo }
 */
let currentCastle = undefined
/**
 * 
 * @param {Number} kingdomID 
 * @param {Number} fromX 
 * @param {Number} fromY 
 * @param {Number} toX 
 * @param {Number} toY 
 * @returns {Promise<import("./protocols.js").ClassTypes.ServerGetAreaInfo>}
 */
async function getAreaInfo(kingdomID, fromX, fromY, toX, toY, useCache) {
    useCache ??= true
    const key = `${kingdomID}_${fromX}_${fromY}_${fromX}_${fromY}`
    let response = myCache.get(key)
    
    if(!response || !useCache) {
        await limiter.removeTokens(1).then(() => setCastle(undefined, () =>
            sendXT("gaa", JSON.stringify({
                KID: Number(kingdomID),
                AX1: Number(fromX),
                AY1: Number(fromY),
                AX2: Number(toX),
                AY2: Number(toY)
            }))))
        const [o, result] = await waitForResult("gaa", 1000 * 10, (obj, result) => {
            if (Number(result) != 0)
                return true

            if (obj.KID != kingdomID)
                return false

            let ai = obj.AI[0]
            if (ai == undefined)
                return false

            let x = ai[1]
            let y = ai[2]

            let startX = fromX < toX ? fromX : toX
            let startY = fromY < toY ? fromY : toY
            let endX = fromX >= toX ? fromX : toX
            let endY = fromY >= toY ? fromY : toY

            if (x < startX || x > endX ||
                y < startY || y > endY)
                return false

            return true

        })
        o.result = result
        response = new ServerGetAreaInfo(o)
        if(response == 0)
            myCache.set(key, response, 60)
    }
    return response
}

const StormInfo = e => ({
    currentAllianceStormRank: Number(e.AR),
    isStormKing: Boolean(e.KA),
    allianceEnteredStorm: Boolean(e.AE),
    currentPlayerStormRank: Number(e.IR),
    playerAquaPoints: Number(e.AP),
    result: Number(e.result)
})
async function clientGetStormIslandInfo() {
    await sendXT("ssi", JSON.stringify({}))

    const [obj, result] = await waitForResult("ssi", 1000 * 10)

    return StormInfo({ ...obj, result: result })
}

const GetProductionData = e => ({
    FoodConsumptionRate: Number(e.DFC) / 10,
    MeadConsumptionRate: Number(e.DMEADC) / 10,
    BeefConsumptionRate: Number(e.DBEEFC) / 10,
    deltaWood: Number(e.DW / 10),
    deltaStone: Number(e.DS / 10),
    deltaFood: Number(e.DF / 10),
    deltaCoal: Number(e.DC / 10),
    deltaOil: Number(e.DO / 10),
    deltaGlass: Number(e.DG / 10),
    deltaAqua: Number(e.DA / 10),
    deltaIron: Number(e.DI / 10),
    deltaHoney: Number(e.DHONEY / 10),
    deltaMead: Number(e.DMEAD / 10),
    deltaBeef: Number(e.DBEEF / 10),

    sickness: Number(e.S), //Old burnt building alternative? Might be connected to riot

    boostWood: Number(e.WM / 100),
    boostStone: Number(e.SM / 100),
    boostFood: Number(e.FM / 100),
    boostCoal: Number(e.CM / 100),
    boostoil: Number(e.OM / 100),
    boostGlass: Number(e.GM / 100),
    boostAqua: Number(e.AM / 100),
    boostIron: Number(e.IM / 100),
    boostHoney: Number(e.HONEYM / 100),
    boostMead: Number(e.MEADM / 100),
    boostBeef: Number(e.BEEFM / 100),

    metroBoost: Number(e.MP ? e.MP : 0),

    foodConsumptionReductionPercentage: Number(e.FCR / 100),
    meadConsumptionReductionPercentage: Number(e.MEADCR / 100),
    beefConsumptionReductionPercentage: Number(e.BEEFCR / 100),

    maxAmountFood: Number(e.MRF),
    maxAmountStone: Number(e.MRS),
    maxAmountWood: Number(e.MRF),
    maxAmountCoal: Number(e.MRC),
    maxAmountIron: Number(e.MRI),
    maxAmountOil: Number(e.MRO),
    maxAmountGlass: Number(e.MRG),
    maxAmountMead: Number(e.MRMEAD),
    maxAmountHoney: Number(e.MRHONEY),
    maxAmountBeef: Number(e.MRBEEF),
    maxAmountAqua: Number(e.MRA),

    safeFood: Number(e.SAFE_F),
    safeStone: Number(e.SAFE_S),
    safeWood: Number(e.SAFE_F),
    safeCoal: Number(e.SAFE_C),
    safeIron: Number(e.SAFE_I),
    safeOil: Number(e.SAFE_O),
    safeGlass: Number(e.SAFE_G),
    safeMead: Number(e.SAFE_MEAD),
    safeHoney: Number(e.SAFE_HONEY),
    safeBeef: Number(e.SAFE_BEEF),
    safeAqua: Number(e.SAFE_A),

    population: Number(e.P),
    decorationPoints: Number(e.NDP),
    decorationPointsReduction: Number(e.R),
    guardCount: Number(e.GRD),
    soldierProductionSpeed: Number(e.RS1),
    offensiveToolProductionSpeed: Number(e.RS2),
    defensiveToolProductionSpeed: Number(e.RS3),
    hospitalProductionSpeed: Number(e.RSH),
    buildSpeedBoost: Number(e.BDB) / 100, //Could be an issue float point integer
    //Beri or other sea event
    maxUnitStorage: Number(e.US),
    hasRoyalCaptialBuff: Boolean(e.RCP),
    maxAuxilariesTroops: Number(e.AUS),
    morality: Number(e.M),
    factionBuff: Number(e.RFPPA)
})

const Unit = e => ({
    unitInfo: units.find(a => a.wodID == e[0]),
    amount: Number(e[1])
})
class UnitInventory { 
    constructor(e) {
    if(e.I) this.unitInventory = Array.from(e.I).map(Unit)
    if(e.SHI) this.strongHoldInventory = Array.from(e.SHI ?? []).map(Unit)
    if(e.HI) this.hospitalInventory = Array.from(e.HI ?? []).map(Unit)
    if(e.TU) this.travelingUnits = Array.from(e.TU ?? []).map(Unit)
    }
}
class UnlockInfo {
    constructor(e) {
        this.kingdomID = Number(e.KID)
        this.isUnlocked = Boolean(e.U)
        this.hasContor = Boolean(e.C)
        this.slumLevel = Number(e.SL)
        this.kingdomResource = Number(e.KRS) //Probs relating to storm
        this.eventRewardsEndID = Number(e.CRS) //Probs relating to storm rewards
    }
}
const ResourceTransfer = e => ({
    remainingTime: Number(e?.RS),
    resources : e?.G ? new Resources(Object.fromEntries(e.G)) : new Resources()
})
const TroopTransfer = e => ({
    remainingTime: Number(e.RS),
    units: Array.from(e.I ?? []).map(Unit)
})
const KingdomInfo = e => ({ //KPI
    unlockInfo: Array.from(e.UL ?? []).map(e => new UnlockInfo(e)),
    resourceTransferList: Array.from(e.RT ?? []).map(ResourceTransfer),
    troopTransferList: Array.from(e.UT ?? []).map(TroopTransfer),
    result: Number(0)
})

//TODO: May conflict with other clientskipResourceTransfer
const clientSkipResourceTransfer = async (skipType, kingdomID, kingdomSkipType) => {
    await sendXT("msk", JSON.stringify({ MST: skipType, KID: `${kingdomID}`, TT: `${kingdomSkipType}` }))
    const [, result] = await waitForResult("msk", 1000 * 10)
    return result
}

//TODO: May Conflict with other clientskipUnitTransfer
async function clientKingdomUnitTransfer(sourceAreaID, sourceKingdomID, targetKingdomID, resources) {
    await sendXT("kgt", JSON.stringify({ SCID: sourceAreaID, SKID: sourceKingdomID, TKID: targetKingdomID, G: resources }))
    
    const [, result] = await waitForResult("kgt", 1000 * 10)
    return result
}
const SubActiveQuests = e => ({
    playerID: Number(e.PID),
    playerName: String(e.PN),
    questID: Number(e.QID),
    questList: Array.from(e.QL),
    timeLeft: Number(e.RS)
})

const ActiveQuests = e => ({
    activeParticipants: Number(e.APC),
    activeQuests: Array.from(e.AQS).map(SubActiveQuests),
    result: Number(e.result)
})

const clientActiveQuestList = async () => {
    await sendXT("aqs", JSON.stringify({}))

    const [obj, result] = await waitForResult("aqs", 1000 * 10)

    return ActiveQuests({ ...obj, result: result })
}

let _activeEventList = {}

let hasStarted = new Promise(r => events.on("load", r))

async function setEvent(obj, result) {
    if(result != 0)
        return

    await hasStarted
    
    obj.E.find(e => {
        if (_activeEventList.E?.find(a => a.EID == e.EID))
            return

        console.debug(`Event ${e.EID} has started`)
        events.emit("eventStart", e)
    })
    
    _activeEventList.E?.find(e => {
        if (obj.E.find(a => a.EID == e.EID))
            return
        
        console.debug(`Event ${e.EID} has stopped`)
        events.emit("eventStop", e)
    })
    
    Object.assign(_activeEventList, { ...obj, result })
}

xtHandler.on("fjf", (obj, result) => setEvent(obj.sei, result))
xtHandler.on("sei", setEvent)

const BuildingInfo = o => ({
    wodID: Number(o[0]),
    ownerID: Number(o[1]),
    x: Number(o[2]),
    y: Number(o[3]),
    rotation : Number(o[4]),
    buildTime : Number(o[5]),
    buildingState: Number(o[6]),
    hitPoints : Number(o[7]),
    constructionBoost : Number(o[8]) / 100,
    efficiency: Number(o[9]),
    damageType: Number(o[10]),
    extraData : Array.from(o).toSpliced(0, 11)
})

class CastleAreaInfo extends EventEmitter {
    constructor(e, kingdomID) {
        super()
        this.areaInfo = MapObject(new GAAAreaInfo(e.AI), kingdomID)
        this.id = Number(this.areaInfo.extraData[0])
        this.abandonOutpostTime = Number(e.AOT)
        this.abandonOutpostTimeCooldown = Number(e.TA)
        this.kingdomID = kingdomID
    }
}
class ConstructionItem {
    constructor(e) {
        this.ownerID = e.OID
        this.constructionItemSlot = Array.from(e.CIL).map(e => ({ constructionItemID : e.CID }))
    }
}
class CastleResourceInfo extends EventEmitter {
    constructor(e, kingdomID) {
        super()
        this.kingdomID = Number(kingdomID)
        this.id = Number(e.AID)
        this.wood = Number(e.W)
        this.stone = Number(e.S)
        this.food = Number(e.F)
        this.coal = Number(e.C)
        this.oil = Number(e.O)
        this.glass = Number(e.G)
        this.iron = Number(e.I)
        this.honey = Number(e.HONEY)
        this.mead = Number(e.MEAD)
        this.aqua = Number(e.A)
        e.D ? this.defence = Number(e.D) : undefined
        e.gpa ? this.getProductionData = GetProductionData(e.gpa) : undefined
        e.AC ? this.unitInventory = Array.from(e.AC).map(Unit) : undefined
        e.SHI ? this.strongHoldInventory = Array.from(e.SHI).map(Unit) : undefined
        e.HI ? this.hospitalInventory = Array.from(e.HI).map(Unit) : undefined
        e.TU ? this.travelingUnits = Array.from(e.TU).map(Unit) : undefined
        e.MC ? this.marketCarriagesCount = Number(e.MC) : undefined
        this.hasBarracks = Boolean(e.B)
        this.hasSiegeWorkshop = Boolean(e.WS)
        this.hasDefenseWorkshop = Boolean(e.DW)
        this.hasHospital = Boolean(e.H)
        e.OGT ? this.openGateTime = Number(e.OGT) : undefined
        e.gca?.BD ? this.buildings = Array.from(e.gca.BD).map(BuildingInfo) : undefined
        e.scl?.OIDL ? this.buildingSlots = Array.from(e.scl.OIDL).map(Number) : undefined
        // this.ownerInfo: new OwnerInfo(o.O)
        //??? : Number(e.RAF)
        //??? : Number(e.RAW)
        //??? : Number(e.RAS)
        //??? : Number(e.RAB)
        //??? : Array.from(e.BG).map()
        //??? : Array.from(e.T).map()
        //??? : Array.from(e.G).map()
        //??? : Array.from(e.D).map()
        e.gca?.CI ? this.constructionItems = Array.from(e.gca.CI).map(e => new ConstructionItem(e)) : undefined
        // this.areaInfo = MapObject(new GAAAreaInfo(o.A), KID)
    }
}
class PermanentCastleData extends EventEmitter {
    constructor(e) {
        super()
        this.unlockedHorses = Array.from(e.UH).map(Number)
        this.id = Number(e.AID)
        this.kingdomID = Number(e.KID)
    }
}
class CastleInfo extends EventEmitter { //JSDOC: HACK
    constructor() {
        super()
        const e = undefined, kingdomID = undefined
        this.areaInfo = MapObject(new GAAAreaInfo(e.AI), kingdomID)
        this.id = Number(this.areaInfo.extraData[0]) ?? Number(e.AID)
        this.abandonOutpostTime = Number(e.AOT)
        this.abandonOutpostTimeCooldown = Number(e.TA)
        this.kingdomID = Number(kingdomID)
        this.wood = Number(e.W)
        this.stone = Number(e.S)
        this.food = Number(e.F)
        this.coal = Number(e.C)
        this.oil = Number(e.O)
        this.glass = Number(e.G)
        this.iron = Number(e.I)
        this.honey = Number(e.HONEY)
        this.mead = Number(e.MEAD)
        this.aqua = Number(e.A)
        this.defence = Number(e.D)
        this.getProductionData = GetProductionData(e.gpa)
        this.unitInventory = Array.from(e.AC ?? []).map(Unit)
        this.strongHoldInventory = Array.from(e.SHI ?? []).map(Unit)
        this.hospitalInventory = Array.from(e.HI ?? []).map(Unit)
        this.travelingUnits = Array.from(e.TU ?? []).map(Unit)
        this.marketCarriagesCount = Number(e.MC ?? [])
        this.hasBarracks = Boolean(e.B)
        this.hasSiegeWorkshop = Boolean(e.WS)
        this.hasDefenseWorkshop = Boolean(e.DW)
        this.hasHospital = Boolean(e.H)
        this.openGateTime = Number(e.OGT)
        this.unlockedHorses = Array.from(e.UH).map(Number)
        this.buildings = Array.from(e.gca?.BD ?? []).map(BuildingInfo)
        this.buildingSlots = Array.from(o.scl?.OIDL ?? []).map(Number)
        this.resourceTransfer = ResourceTransfer(e)
        this.troopTransfer = TroopTransfer(e)
        this.constructionItems = Array.from(e.gca.CI).map(e => new ConstructionItem(e))
    }
}
/** @type {Array<CastleInfo>} */
const castles = []
xtHandler.on("hru", (obj, r) => {
    if(r != 0)
        return
    if(!currentCastle)
        return

    Object.assign(currentCastle.unitInventory, new UnitInventory(obj.gui))
    
    if(obj.gcu)
        xtHandler.emit("gcu", obj.gcu)
})
xtHandler.on("dcl", (obj, result) => {
    if(result != 0)
        return
    
    const resourceCastleList = Array.from(obj.C)
            .map(a => Array.from(a.AI).map(e => new CastleResourceInfo(e, a.KID))).flat()
    resourceCastleList.forEach(castleChanges => {
        const castle = castles.find(e => e.kingdomID == castleChanges.kingdomID && e.id == castleChanges.id)
        if(castle) {
            Object.assign(castle, castleChanges)
            castle.emit("resourceUpdate")
            return
        }
        
        castles.push(castleChanges)
    })
})

xtHandler.on("gcl", (obj, result) => {
    if(result != 0)
        return
    
    const resourceCastleList = Array.from(obj.C)
            .map(a => Array.from(a.AI).map(e => new CastleAreaInfo(e, a.KID))).flat()
    resourceCastleList.forEach(castleChanges => {
        const castle = castles.find(e => e.id == castleChanges.id)
        if(castle)
            return Object.assign(castle, castleChanges)

        castles.push(castleChanges)
    })
})
xtHandler.on("fjf", (obj, result) => {
    if(result != 0)
        return
    const resourceCastleList = Array.from(obj.mir.gcl.C)
            .map(a => Array.from(a.AI).map(e => new CastleAreaInfo(e, a.KID))).flat()
    resourceCastleList.forEach(castleChanges => {
        const castle = castles.find(e => e.id == castleChanges.id)
        if(castle)
            return Object.assign(castle, castleChanges)

        castles.push(castleChanges)
    })
})
xtHandler.on("gpc", (obj, result) => {
    if(result != 0)
        return
    
    const permanentCastleData = Array.from(obj.A).map(e => new PermanentCastleData(e))

    permanentCastleData.forEach(castleChanges => {
        const castle = castles.find(e => e.id == castleChanges.id)
        if(castle)
            return Object.assign(castle, castleChanges)

        Object.assign(castleChanges, new EventEmitter())
        castles.push(castleChanges)
    })
})
/** @type {Array<UnlockInfo>} */
let unlockInfoList = []

function skipUnitTransferList(obj, result)  {
    if(result != 0)
        return
    if(!obj)
        debugger
    
    if (obj.UL) {
        Array.from(obj.UL).map(e => new UnlockInfo(e)).forEach(unlockInfoChanges => {
            const unlockInfo = unlockInfoList.find(e => e.kingdomID == unlockInfoChanges.kingdomID)
            if(unlockInfo) {
                return Object.assign(unlockInfo, unlockInfoChanges)
            }
            unlockInfoList.push(unlockInfoChanges)
        })
    }
    if (obj.RT) {
        castles.forEach(e => e.resourceTransfer = ResourceTransfer())
        Array.from(obj.RT).map(a =>
            castles.find(e => e.kingdomID == a.KID &&
                [AreaType.mainCastle, AreaType.externalKingdom, AreaType.beriCastle].includes(e.areaInfo.type)).resourceTransfer = ResourceTransfer(a))
    } else 
        castles.forEach(e => e.resourceTransfer = undefined)
    if (obj.UT) {
        castles.forEach(e => e.troopTransfer = undefined)
        Array.from(obj.UT).map(a => {
            const castle = castles.find(e => e.kingdomID == a.KID &&
                [AreaType.mainCastle, AreaType.externalKingdom, AreaType.beriCastle].includes(e.areaInfo.type))
            if(castle == undefined)
                debugger
            
            castle.troopTransfer = TroopTransfer(a)
        })
    } else 
        castles.forEach(e => e.troopTransfer = undefined)
}
xtHandler.on("kpi", skipUnitTransferList)
xtHandler.on("fjf", (obj, result) => skipUnitTransferList(obj?.kpi, result))
xtHandler.on("kgt", (obj, result) => skipUnitTransferList(obj?.kpi, result))
xtHandler.on("msk", (obj, result) => {
    skipUnitTransferList(obj?.kpi, result)
})
xtHandler.on("kut", (obj, result) => {
    skipUnitTransferList(obj.kpi, result)
})

const decapitalizeFirstLetter = val => 
    String(val).charAt(0).toLowerCase() + String(val).slice(1)

const capitalizeFirstLetter = val => 
    String(val).charAt(0).toUpperCase() + String(val).slice(1)

const ResourceList = obj => {
    let resource = {}
    obj.forEach(([type, amount]) => {
        const nameOverrides = {
            component1: "screws",
            component2: "blackPowder",
            component3: "saws",
            component4: "drills",
            component5: "crowbars",
            component6: "leatherStrips",
            component7: "chains",
            component8: "metalPlates",
        }
        let name = decapitalizeFirstLetter(currencies.find(e => e.JSONKey == type)?.Name)
        
        if(!name)
            return

        let realName = nameOverrides[name] ?? name
        resource[realName] = amount
    })
    return resource
}

const resources = {
    "1MinSkip": NaN,
    "5MinSkip": NaN,
    "10MinSkip": NaN,
    "30MinSkip": NaN,
    "60MinSkip": NaN,
    "5HourSkip": NaN,
    "24HourSkip": NaN,
    allianceCoin: NaN,
    barinToken: NaN,
    cargoPoints: NaN,
    castlePassageToken: NaN,
    coins: NaN,
    commonBricks: NaN,
    commonFinesand: NaN,
    commonStraw: NaN,
    commonTimber: NaN,
    screws : NaN,
    blackPowder : NaN,
    saws : NaN,
    drills : NaN,
    crowbars : NaN,
    leatherStrips : NaN,
    chains : NaN,
    metalPlates : NaN,
    decoCatalyst30: NaN,
    decoCatalyst60: NaN,
    decoCatalyst70: NaN,
    decoDust: NaN,
    dragonCharm: NaN,
    dragonriderLTPEToken: NaN,
    dragonScaleSplinters: NaN,
    dragonScaleTile: NaN,
    epicBoosterConsumable: NaN,
    epicCobblestone: NaN,
    epicMysteryBoxKey: NaN,
    epicPreciousmetals: NaN,
    epicResin: NaN,
    essence: NaN,
    fatKingToken: NaN,
    floraToken: NaN,
    fusionCurrency: NaN,
    generalsSkillsResetToken: NaN,
    goldToken: NaN,
    hasanToken: NaN,
    iceLTPEToken: NaN,
    imperialDucat: NaN,
    kaelrithToken: NaN,
    khanMedal: NaN,
    khanTablet: NaN,
    knightToken: NaN,
    legendaryBoosterConsumable: NaN,
    legendaryFabric: NaN,
    legendaryMaterial: NaN,
    legendaryRiftCoin: NaN,
    legendarySoulstone: NaN,
    legendaryToken: NaN,
    luckyWheelTicket: NaN,
    newKingLTPEToken: NaN,
    pearlRelic: NaN,
    pegasusTicket: NaN,
    plaster: NaN,
    princessToken: NaN,
    questTicket: NaN,
    rareBoosterConsumable: NaN,
    rareFarmingtools: NaN,
    rareFlint: NaN,
    rareGlue: NaN,
    rareNails: NaN,
    refinedLumber: NaN,
    refinedStone: NaN,
    relicFragment: NaN,
    resourceVillageToken: NaN,
    riftCoin: NaN,
    rubies: NaN,
    saleDaysLuckyWheelTicket: NaN,
    samuraiMedal: NaN,
    samuraiMedalBoosterKey: NaN,
    samuraiToken: NaN,
    sceatToken: NaN,
    shardAlice: NaN,
    shardAlyssa: NaN,
    shardAshira: NaN,
    shardDiana: NaN,
    shardEdric: NaN,
    shardGarrik: NaN,
    shardHasan: NaN,
    shardHoratio: NaN,
    shardKaelrith: NaN,
    shardLeo: NaN,
    shardSasaki: NaN,
    shardTizi: NaN,
    shardToril: NaN,
    shardValenta: NaN,
    shogunPointBoosterKey: NaN,
    silverToken: NaN,
    soldierBiscuit: NaN,
    tiziToken: NaN,
    xmasLTPEToken: NaN,
    dragonGlass: NaN,
    steel: NaN,
}

xtHandler.on("gcu", obj => {
    resources.coins = obj.C1
    resources.rubies = obj.C2
})

xtHandler.on("sce", obj =>
    Object.assign(resources, ResourceList(obj)))

const Feast = e => ({
    type: Number(e.T),
    deltaTime: Number(e.RT),
    result: Number(e.result)
})
async function clientStartFeast(type, areaID, kingdomID) {
    await sendXT("bfs", JSON.stringify({ T: type, CID: areaID, KID: kingdomID, PO: -1, PWR: 0 }))

    const [obj, result] = await waitForResult("bfs", 1000 * 10)

    return Feast({ ...obj, result: result })
}
const HighscoreList = e => ({
    score: Number(e[0]),
    amount: Number(e[1]),
    playerData: new OwnerInfo(e[2])
})
const Highscore = e => ({
    eventType: Number(e.LT),
    lootID: Number(e.LID),
    list: Array.from(e.L).map(HighscoreList),
    lootRanking: Number(e.LR),
    searchVariable: String(e.SV),
    rank: Number(e.FR),
    IGH: Number(e.IGH), //TODO: figure this bitch out
    result: Number(e.result)
})


const clientGetHighscore = (LT, LID, SV) => {
    const limiter = sendXT("hgh", JSON.stringify({ LT, LID, SV: `${SV}` }))

    return async () => {
        await limiter
        const [obj, result] = await waitForResult("hgh", 1000 * 10, (obj, result) => {
            if (obj.LT != LT)
                return false
            if (obj.SV != SV)
                return false
            if (obj.LID != LID)
                return false
            return true
        })

        return Highscore({ ...obj, result: result })
    }
}
const Alliance = e => ({
    members: Array.from(e.M).map(o => new OwnerInfo(o)),
    allianceID: Number(e.AID),
    //??? : e.CF,
    mightPoints: Number(e.MP),
    description: String(e.D),
    language: String(e.ALL),
    //??? : Number(e.HP),
    //??? : Number(e.IS),
    //??? : Number(e.IA),
    //??? : Number(e.KA),
    allianceCrest: AllianceCrest(e.aee),
    //??? : Number(e.ACLS)
    //??? : Number(e.ML)
    announcement: String(e.A)
    //??? : Number(e.FR),
    //??? : Number(e.SP),
    //??? : Number(e.AP),
    //??? : Number(e.AW),
    //??? : Number(e.HAMP),
    //??? : Number(e.HF),
    //??? : Number(e.AA),
    //??? : Number(e.RT),
    //??? : Array.from(e.ADL).map(),
    //??? : Array.from(e.ABL).map(),
    //??? : AllianceStorage(e.STO),
    //??? : Object(e.AMI),
    //??? : Object(e.ACA),
    //??? : Object(e.ATC),
    //??? : Object(e.AKT),
    //??? : Object(e.AMO),
    //??? : Array.from(e.ALA).map(),
    //??? : Number(e.MF),
    //??? : Number(e.IF),
    //??? : Number(e.SRFU),
    //??? : Number(e.HRFU),

})


async function clientJoinArea(x, y, kingdomID) {
    await sendXT("joa", JSON.stringify({ PX: x, PY: y, KID: kingdomID }))

    const [obj, result] = await waitForResult("jaa", 1000 * 10, obj => {
        if (obj.KID != kingdomID)
            return false
        if (obj.gca.A[1] != x)
            return false
        if (obj.gca.A[2] != y)
            return false

        return true
    })

    const castleChanges = new CastleResourceInfo(obj.grc.gpa ?? obj.gpa, obj.KID)

    const castle = castles.find(e => e.kingdomID == castleChanges.kingdomID && e.id == castleChanges.id)

    if (!castle)
        debugger

    Object.assign(castle, castleChanges)
}

async function clientJoinCastle(areaID, kingdomID) {
    await sendXT("jca", JSON.stringify({ CID: areaID, KID: kingdomID }))

    const [obj, r] = await waitForResult("jaa", 1000 * 10, (o, r) => {
        return r != 0 || o.grc.KID == kingdomID && o.grc.AID == areaID
    })
    obj.grc.gca ??= obj.gca
    obj.grc.gpa ??= obj.gpa
    obj.grc.scl ??= obj.gca.scl
    
    const castleChanges = new CastleResourceInfo(obj.grc, obj.KID)

    const castle = castles.find(e => e.kingdomID == castleChanges.kingdomID && e.id == castleChanges.id)

    if (!castle)
        debugger

    Object.assign(castle, castleChanges)
    return r
}

async function clientSearchPlayerName(playerName, kingdomID) {
    kingdomID ??= 0
    const castle = castles.find(castle => castle.kingdomID == kingdomID)
    
    await setCastle(castle, () => sendXT("wsp", JSON.stringify({ PN: playerName })))

    const [obj, result] = await waitForResult("wsp", 1000 * 10, (o, r) =>
        r != 0 || o.gaa?.OI.find(e => e.N == playerName))

    return new ServerGetAreaInfo({ ...obj.gaa, result: result })
}
const AllianceQuestPlayerScore = e => ({
    playerID: Number(e.PID),
    playerName: String(e.PN),
    level: Number(e.L),
    points: Number(e.OP),
    allianceRank: Number(e.R)
})
const AllianceQuestPointCount = e => ({
    list: Array.from(e.AQPC).map(AllianceQuestPlayerScore),
    result: Number(e.result)
})
async function clientAllianceQuestPointCount() {
    await sendXT("aqpc", JSON.stringify({}))
    const [obj, result] = await waitForResult("aqpc", 1000 * 10)

    return result == 0 ? AllianceQuestPointCount(obj) : result
}

class Lord {
    constructor(e) {
        this.lordID = Number(e.ID)
        // this.??? = Number(e.WID)
        this.lordPosition = Number(e.VIS)
        this.name = String(e.N)
        this.generalID = Number(e.GID)
        this.generalLevel = Number(e.L)
        // this.??? = Number(e.ST)
        // this.??? = Number(e.W)
        // this.??? = Number(e.D)
        // this.??? = Number(e.SPR)
        // this.??? = Array.from(e.GASAIDS)
        // this.??? = Array.from(e.SIDS)
        // this.??? = Array.from(e.AE)

        // setEffects = ()
        // areaTypeEffects = ()

        let ungroupedActiveEffects = {}

        generals.find(a => a.GID == e.generalID)?.SIDS.forEach(skillID => {
            const generalSkill = generalSkills.find(e => e.skillID == skillID)
            if (!generalSkill)
                return

            const [effectID, value] = generalSkill.effects.split("&")
            let effect = effects.find(e => e.effectID == effectID)

            let maxCap = Number(effectCaps.find(e => e.capID == effect.capID)?.maxTotalBonus ?? Infinity)

            ungroupedActiveEffects[effectID] = Math.min(maxCap, (ungroupedActiveEffects[effectID] ?? 0) + Number(value))
        })
        this.areaEffects = {}

        e.EQ?.forEach(equipment => {
            const isRelic = equipment[11] == 3
            const getEffects = ([id, var1, var2]) => {
                const effectValues = isRelic ? var2 : var1
                const { effectID } = isRelic ? relicEffects.find(e => e.id == id) : equipmentEffects.find(e => e.equipmentEffectID == id)

                if (effectID == undefined)
                    return

                let { areaTypeID, capID } = effects.find(e => e.effectID == effectID)

                if (areaTypeID)
                    return areaTypeID.split(',').map(Number).forEach(areaType => {
                        const maxCap = Number(effectCaps.find(e => e.capID == capID).maxTotalBonus ?? Infinity)

                        this.areaEffects[areaType] ??= {}
                        this.areaEffects[areaType][effectID] = Math.min(maxCap, (this.areaEffects[areaType][effectID] ?? 0) + Number(effectValues[0]))
                    })

                let maxCap = Number(effectCaps.find(e => e.capID == capID).maxTotalBonus ?? Infinity)

                ungroupedActiveEffects[effectID] = Math.min(maxCap, (ungroupedActiveEffects[effectID] ?? 0) + Number(effectValues[0]))
            }
            equipment[5]?.forEach(getEffects)
            equipment[12]?.[3]?.[4]?.forEach(getEffects)
        })

        this.effects = {}

        for (const key in ungroupedActiveEffects) {
            const { effectTypeID } = effects.find(e => e.effectID == key)
            const { name } = effectTypes.find(e => e.effectTypeID == effectTypeID)
            this.effects[name] ??= 0
            this.effects[name] += ungroupedActiveEffects[key]
        }
    }
    getEffects(type, areaEffects) {
        if(type == undefined && areaEffects == undefined)
            return this.effects

        let activeEffects = {...this.effects}
        let ungroupedActiveEffects = this.areaEffects[type] ?? {}
        
        areaEffects?.forEach(([effectID, effectValues]) => {
            let effect = effects.find(e => e.effectID == effectID)
            
            if (!effect.areaTypeID?.split(',').map(Number).find(areaType => areaType == type))
                return

            let maxCap = Number(effectCaps.find(e => e.capID == effect.capID)?.maxTotalBonus ?? Infinity)

            ungroupedActiveEffects[effectID] = Math.min(maxCap, (ungroupedActiveEffects[effectID] ?? 0) + Number(effectValues[0]))
        })

        for (const key in ungroupedActiveEffects) {
            const { effectTypeID } = effects.find(e => e.effectID == key)
            const { name } = effectTypes.find(e => e.effectTypeID == effectTypeID)
            activeEffects[name] ??= 0
            activeEffects[name] += ungroupedActiveEffects[key]
        }
        return activeEffects
    }
}
/** @type {Array<Movement>} */
const movements = []
const movementEvents = new EventEmitter()
/** @param {Movement} movement */
async function newMovement(movement) {
    if (isNaN(playerInfo.playerID))
        playerInfo.playerID = Number(await new Promise(r => xtHandler.once("gpi", ({PID}) => r(PID))))

    const e = movements.find(e => e.id == movement.id)
    if(e) {
        Object.assign(e, movement)
        if(e.canSeeArmy != movement.canSeeArmy) {
            // console.log(`Movement changed: lordID: ${movement.lord.lordID}, lordName: ${movement.lord.name}, name: ${movement.owner.name}`)
    
            movementEvents.emit("outgoing", movement)
        }
        return
    }

    movements.push(movement)
    
    // console.log(`New movement: lordID: ${movement.lord.lordID}, lordName: ${movement.lord.name}, name: ${movement.owner.name}`)
    
    movementEvents.emit("outgoing", movement)

    if (movement.targetOwner.ownerID == movement.owner.ownerID)
        movementEvents.emit("returning", movement)
    // console.log(`${Math.floor((movement.totalTime - (movement.deltaTime - Date.now()) + 1000) / 1000)} seconds`)
    setTimeout(() => {
        const movementIndex = movements.findIndex(e => e.id == movement.id)
        if(movementIndex == -1) {
            debugger
            return
        }

        movements.splice(movementIndex, 1)

        if (movement.targetOwner.ownerID == movement.owner.ownerID) {
            // console.log(`Removed movement: lordID: ${movement.lord.lordID}, lordName: ${movement.lord.name}, name: ${movement.owner.name}`)
            movementEvents.emit("return", movement)
        }

    },  Math.max(0, movement.totalTime - (movement.deltaTime - Date.now()) + 1000))
}
class Resources {
    constructor(e) {
        this.wood = Number(e?.W ?? 0)
        this.stone = Number(e?.S ?? 0)
        this.food = Number(e?.F ?? 0)
        this.coal = Number(e?.C ?? 0)
        this.oil = Number(e?.O ?? 0)
        this.glass = Number(e?.G ?? 0)
        this.iron = Number(e?.I ?? 0)
        this.honey = Number(e?.HONEY ?? 0)
        this.mead = Number(e?.MEAD ?? 0)
        this.aqua = Number(e?.A ?? 0)
    }
}
class Movement {
    /** @param {Array<OwnerInfo>} ownerInfo */
    constructor(movement, ownerInfo) {
        if(movement.M.T == undefined)
            debugger

        this.id = Number(movement.M.MID)
        this.type = Number(movement.M.T)
        this.kingdomID = Number(movement.M.KID)
        this.totalTime = Number(movement.M.TT) * 1000
        this.deltaTime = Number(movement.M.PT) * 1000 + Date.now()

        this.lord = new Lord(movement.UM?.L ?? {})
        this.owner = ownerInfo.find(o => o.ownerID == Number(movement.M.OID)) ?? { ownerID : Number(movement.M.OID) }
        this.targetOwner = ownerInfo.find(o => o.ownerID == Number(movement.M.TID)) ?? new OwnerInfo({ OID : Number(movement.M.TID) })
        this.sourceOwner = ownerInfo.find(o => o.ownerID == Number(movement.M.SID)) ?? new OwnerInfo({ OID : Number(movement.M.SID) })
        this.targetAttack = MapObject(new GAAAreaInfo(movement.M.TA), movement.M.KID)
        this.sourceAttack = MapObject(new GAAAreaInfo(movement.M.SA), movement.M.KID)

        this.horseType = Number(movement.M.HBW)

        this.canSeeArmy = !!movement.GA

        this.left = Array.from(movement.GA?.L ?? []).map(Unit)
        this.middle = Array.from(movement.GA?.M ?? []).map(Unit)
        this.right = Array.from(movement.GA?.R ?? []).map(Unit)
        this.courtyard = Array.from(movement.GA?.RW ?? []).map(Unit)
        
        this.left ??= Array.from(movement.FA?.L ?? []).map(Unit)
        this.middle ??= Array.from(movement.FA?.M ?? []).map(Unit)
        this.right ??= Array.from(movement.FA?.R ?? []).map(Unit)
        this.courtyard ??= Array.from(movement.FA?.RW ?? []).map(Unit)

        this.station = Array.from(movement.A ?? []).map(Unit)
        this.resources = new Resources(Object.fromEntries(movement.G ?? []))
        newMovement(this)
    }
}

movementEvents.on("return", async (/** @type {Movement} */ movement) => {
    if (movement.owner.ownerID != playerInfo.playerID)
        return
    if (movement.targetOwner.ownerID != playerInfo.playerID)
        return

    const castle = castles.find(castle => castle.kingdomID == movement.kingdomID && castle.id == movement.targetAttack.extraData[0])
    if(!castle)
        debugger
    movement.station.forEach(unit => {
        const unitInInventory = castle.unitInventory.find(e => e.unitInfo.wodID == unit.unitInfo.wodID)
        if(unitInInventory)
            return unitInInventory.amount += unit.amount
        castle.unitInventory.push(unit)
    })
    Object.entries(movement.resources).forEach((([key,value]) => {
        castle[key] = Math.min(castle[key] + value, castle.getProductionData[`maxAmount${capitalizeFirstLetter(key)}`])
    }))
    castle.emit("resourceUpdate", movement.resources)
})
xtHandler.on("cra", (o, r) => r == 0 ? 
    new Movement(o.AAM, Array.from(o.O ?? []).map(o => new OwnerInfo(o))) : undefined)

xtHandler.on("cra", (_, r) => r != 0 ? 
    sendXT("dcl", JSON.stringify({ CD: 1 })) : undefined)

xtHandler.on("cat", (o, r) => {
    if(r == 0) 
        new Movement(o.A, Array.from(o.O ?? []).map(o => new OwnerInfo(o)))
})
xtHandler.on("gam", (o, r) => r == 0 ? 
    Array.from(o.M ?? []).map(e => new Movement(e, Array.from(o.O ?? []).map(o => new OwnerInfo(o)))) : undefined)

xtHandler.on("dms", ({MID}) => MID.forEach(movementID => () => {
    const movementIndex = movements.findIndex(e => e.id == Number(movementID))
    if (movementIndex == -1)
        return
    
    const movement = movements.splice(movementIndex, 1)

    movementEvents.emit("return", movement)
}))

async function clientGetAllianceByID(allianceID) {
    await sendXT("ain", JSON.stringify({ AID: allianceID }))

    const [obj, result] = await waitForResult("ain", 1000 * 10, (obj, result) =>
        result != 0 || obj?.A.AID == allianceID)

    return result == 0 ? Alliance(obj.A) : { result }
}
async function clientGetAllianceByName(name) {
    await sendXT("hgh", JSON.stringify({ LT: 11, SV: name }))

    const [obj, result] = await waitForResult("hgh", 1000 * 60 * 5, (obj, result) => {
        if (result != 0)
            return true

        if (obj.LT != 11 || obj.SV.toLowerCase() != name.toLowerCase())
            return false
        return true
    })

    let item = obj?.L?.find(e => e[2][1].toLowerCase() == name.toLowerCase())
    
    if (item == undefined)
        throw Error("ALLIANCE_NOT_FOUND")

    return clientGetAllianceByID(item[2][0])()
}

const getKingdomID = areaInfo => {
    if(areaInfo.type == 2)
        return areaInfo.extraData[3]
    if(areaInfo.type == 11)
        return areaInfo.extraData[4]
    return undefined
}

xtHandler.on("gaa", (obj, result) => {
    if(result != 0)
        return

    obj.result = result

    obj.KID ??= getKingdomID(new GAAAreaInfo(obj?.AI[0]))

    return new ServerGetAreaInfo(obj)
})
xtHandler.on("ssi", (obj, r) => r == 0 ? new ServerGetAreaInfo(obj.gaa) : undefined)
xtHandler.on("msd", (obj, r) => {
    if(r != 0)
        return

    const areaInfo = new GAAAreaInfo(obj.AI)

    MapObject(areaInfo, getKingdomID(areaInfo))
})

function updateStatus() {
    status.resources = resources
    parentPort.postMessage([ActionType.StatusUser, status])
}

xtHandler.on("gcu", updateStatus)
xtHandler.on("sce", updateStatus)

let kingdomCallbacks = new Map()
let kingdomInUse = false

/**
 * 
 * @param {CastleInfo} castle 
 * @param {*} callback 
 * @returns 
 */
let setCastle = (castle, callback) => new Promise(async (resolve, reject) => {
    let callbacks = kingdomCallbacks.get(castle)
    if(!callbacks) {
        callbacks = []
        kingdomCallbacks.set(castle, callbacks)
    }
    
    callbacks.push(async castle => {
        try {
            if (castle && currentCastle != castle) {
                // console.log("Changing kingdoms")
                if(await clientJoinCastle(castle.id, castle.kingdomID) != 0)
                    throw new Error("FAILED_TO_SET_CASTLE")
            }
            // if(currentCastle == castle)
                // console.log("Prevented changing castle")
            // if(undefined == castle)
                // console.log("Prevented changing on map data")

            currentCastle = castle
            resolve(await callback())
        }
        catch (e) {
            reject(e)
        }
    })

    if (kingdomInUse)
        return

    kingdomInUse = true

    for (let wasntEmpty = true; wasntEmpty;) {
        wasntEmpty = false
        for (const [key, value] of kingdomCallbacks.entries()) {
            while (value.length > 0) {
               await (value.shift())(key)
               wasntEmpty = true
            }
        }
    }

    kingdomInUse = false
})

module.exports = {
    spiralCoordinates,
    setCastle,
    movementEvents,
    movements,
    castles,
    resources,
    unlockInfoList,
    ClientCommands: {
        preSpyInfo : clientPreSpyInfo,
        getNextMapObject : clientGetNextMapObject,
        skipTarget : clientSkipTarget,
        getHighScore: clientGetHighscore,
        getAreaInfo: getAreaInfo,
        startFeast: clientStartFeast,
        getStormIslandInfo: clientGetStormIslandInfo,
        kingdomUnitTransfer: clientKingdomUnitTransfer,
        skipResourceTransfer: clientSkipResourceTransfer,
        activeQuestList: clientActiveQuestList,
        joinArea: clientJoinArea,
        searchPlayerName: clientSearchPlayerName,
        allianceQuestPointCount: clientAllianceQuestPointCount,
        getAllianceByID: clientGetAllianceByID,
        getAllianceByName : clientGetAllianceByName,
        joinCastle: clientJoinCastle
    },
    ClassTypes: {
        UnitInventory,
        OwnerInfo,
        ServerGetAreaInfo,
        Lord,
        GAAAreaInfo,
        Movement,
        CastleInfo,
        BuildingInfo,
        Unit,
        KingdomInfo
    },
    KingdomSkipType,
    HighscoreType,
    KingdomID,
    AreaType
}
