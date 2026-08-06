import ReconnectingWebsocket from "reconnecting-websocket"

export default new ReconnectingWebsocket(`//${window.location.hostname}:${8080 ?? window.location.port}`, [], { WebSocket, minReconnectionDelay: 3000 })