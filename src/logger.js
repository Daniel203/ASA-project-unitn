import pino from "pino"

const today = new Date()
const todayFormatted = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}_${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`

const transports = pino.transport({
    targets: [
        /*       {
            level: "trace",
            target: "pino-pretty",
            options: { destination: `logs/${todayFormatted}.log`, mkdir: true },
        },*/
        // { level: "info", target: "pino-pretty", options: { include: "level,time" } },
    ],
})

export const logger = pino(transports)
