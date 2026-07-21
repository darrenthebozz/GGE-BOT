
import ReconnectingWebSocket from "reconnecting-websocket"

export default new ReconnectingWebSocket(`//${window.location.hostname}:${8080 ?? window.location.port}`, [], { WebSocket, minReconnectionDelay: 3000 })