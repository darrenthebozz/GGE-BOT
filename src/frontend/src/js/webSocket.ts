import ReconnectingWebsocket from "reconnecting-websocket"
import ggeConfig from "@bot/ggeConfig.json"

export default new ReconnectingWebsocket(ggeConfig.url, [], { WebSocket, minReconnectionDelay: 3000 })