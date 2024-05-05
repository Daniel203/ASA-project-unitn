import pino from "pino"

//create a trasport
const fileTransport = pino.transport({
    target: "pino/file",
    options: { destination: `./src/log/app.log` },
})

//create a logger
export const logger = pino(
    {
        level: "info",
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() }
            },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    },
    fileTransport,
)
