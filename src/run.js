import { DeliverooApi } from "@unitn-asa/deliveroo-js-client"
import { distance, sleep, getOptionScore, getNearestDelivery } from "./utils.js"
import "./types.js"
import { myAgent } from "./intention.js"
import { logger } from "./logger.js"

export const client = new DeliverooApi(
    //"http://localhost:8080",
    "https://deliveroojs.onrender.com",
    //"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQzMDEzYjI3NTQ1IiwibmFtZSI6IlZDQVJCIiwiaWF0IjoxNzE0Njc5NjY3fQ.zTwxpdXyHHV2zes7Vw4-SFuLl120KC5XDAgqlgSOxb4",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImYyMDg2NTRiMWY0IiwibmFtZSI6InRlc3QiLCJpYXQiOjE3MTQ5MzY4NjF9.7v0TiO7JMM55staWC6kIzyuCf-rZ-9DXjm8NBLXebGU",
)

export var speed = 0
client.onConfig((x) => {
    speed = parseInt(x.MOVEMENT_DURATION)
})
logger.info(speed)

/** @type {Me} */
export const me = {}

/**
 * @type {Array<Array<number>>} - the map of the game
 * 0 - NoZone
 * 1 - Walkable
 * 2 - Delivery
 */
export const grid = []

client.onYou(({ id, name, x, y, score }) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
})

export const rivals = new Map()
client.onAgentsSensing(async (rival) => {
    for (const p of rival) {
        rivals.set(p.id, p)
    }
})

client.onMap((width, height, tiles) => {
    if (grid.length == 0) {
        for (let i = 0; i < width; i++) {
            const col = []
            for (let j = 0; j < height; j++) {
                col.push(1)
            }
            grid.push(col)
        }
    }
})

/** @type {Map<number, Parcel>} */
export const parcels = new Map()
/** @type {Array<Parcel>} */
var myParcels = []
client.onParcelsSensing(async (perceived_parcels) => {
    myParcels = []

    for (const p of perceived_parcels) {
        parcels.set(p.id, p)

        if (p.carriedBy == me.id) {
            myParcels.push(p)
        }
    }
})

/** @type {Array<Point>} */
export const deliveries = []
client.onTile(async (x, y, delivery, parcel) => {
    if (grid.length == 0) await sleep(1000)

    if (delivery) {
        deliveries.push({ x: x, y: y })
        grid[x][y] = 2
    }
})

export const noZone = []
client.onNotTile(async (x, y) => {
    if (grid.length == 0) await sleep(1000)

    noZone.push({ x: x, y: y })
    grid[x][y] = 0
})

async function agentLoop() {
    /** @type {Array<Option>} */
    const options = []

    for (const parcel of parcels.values()) {
        if (!parcel.carriedBy) {
            options.push({
                action: "go_pick_up",
                x: parcel.x,
                y: parcel.y,
                id: parcel.id,
                value: parcel.reward,
            })
        }
    }

    deliveries.sort((a, b) => distance(me, a) - distance(me, b))
    var bestOptionPutDown
    if (deliveries.length > 0) {
        const bestDelivery = deliveries[0]
        bestOptionPutDown = {
            action: "go_put_down",
            x: bestDelivery.x,
            y: bestDelivery.y,
            id: `D(${bestDelivery.x}, ${bestDelivery.y})`,
            value: 0,
        }
    }

    /** @type {Option} */
    let bestOptionPickUp
    let bestScorePickUp = 0
    let bestOption
    for (const option of options) {
        if (option.action == "go_pick_up") {
            let dist = distance(me, option)
            let score = getOptionScore(option, dist, rivals)
            if (score > bestScorePickUp) {
                bestOptionPickUp = option
                bestScorePickUp = score
            }
        }
    }

    if (bestOptionPickUp || bestOptionPutDown) {
        var potentialScorePickUp = 1
        var potentialScorePutDown = 0

        const actualScoreMyParcels =
            myParcels.length > 0 ? myParcels.map((p) => p.reward).reduce((a, b) => a + b) : 0

        if (bestOptionPickUp) {
            //TODO: add rivals
            let minDistanceDel = getNearestDelivery(bestOptionPickUp, deliveries)
            potentialScorePickUp = Math.max(
                1,
                actualScoreMyParcels -
                    (distance(me, bestOptionPickUp) * speed) / 1000 +
                    bestOptionPickUp.value -
                    minDistanceDel,
            )

            console.log(bestOptionPickUp)
            console.log("distance: " + distance(me, bestOptionPickUp))
        }

        if (bestOptionPutDown) {
            potentialScorePutDown = Math.max(
                0,
                actualScoreMyParcels - (distance(me, bestOptionPutDown) * speed) / 1000,
            )
            console.log(distance(me, bestOptionPutDown))
            console.log(actualScoreMyParcels)
        }

        console.log(`bestOptionPutDown: `, potentialScorePutDown)
        console.log(`bestOptionPickUp: `, potentialScorePickUp)
        console.log("")
        let bestOption =
            potentialScorePickUp > potentialScorePutDown ? bestOptionPickUp : bestOptionPutDown

        if (bestOption) {
            myAgent.push(bestOption)
        }
    }
}

client.onParcelsSensing(agentLoop)
client.onAgentsSensing(agentLoop)
client.onYou(agentLoop)
