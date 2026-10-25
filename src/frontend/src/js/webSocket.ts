import ReconnectingWebsocket from "reconnecting-websocket"
let debug = 8080
export default new ReconnectingWebsocket(`//${window.location.hostname}:${debug ?? window.location.port}`, [], { WebSocket, minReconnectionDelay: 3000 })