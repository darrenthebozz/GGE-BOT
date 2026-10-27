import net from 'node:net'

export default function waitForPort(port: number, host = 'localhost', timeout = 100000) {
    return new Promise<void>((resolve, reject) => {
        const startTime = Date.now()

        function check() {
            const socket = new net.Socket()

            socket.connect(port, host, () => {
                socket.destroy()
                resolve()
            })

            socket.on('error', () => {
                socket.destroy()
                if (Date.now() - startTime > timeout)
                    reject(new Error(`Timeout waiting for port ${port}`))
                else
                    setTimeout(check, 200)
            })
        }

        check()
    })
}