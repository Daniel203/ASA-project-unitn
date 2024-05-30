import { DeliverooApi } from "@unitn-asa/deliveroo-js-client"
import { sleep, getOptionScore } from "./utils.js"
import "./types.js"
import { myAgent } from "./agent.js"
import { logger } from "./logger.js"

import * as pf from "@cetfox24/pathfinding-js"

export const client = new DeliverooApi()

/** @type {} */
const finder = new pf.AStar()

export var speedParcel = 0
export var speed = 0
export var maxParcels = 0
export var distanceVisibility = 0
export var agentObservationDistance

client.onConfig((x) => {
    distanceVisibility = parseInt(x.PARCELS_OBSERVATION_DISTANCE)
    speed = parseInt(x.MOVEMENT_DURATION)
    maxParcels = parseInt(x.PARCELS_MAX)
    if (x.PARCEL_DECADING_INTERVAL == "infinite") {
        speedParcel = 0
    } else {
        speedParcel = parseInt(x.PARCEL_DECADING_INTERVAL)
    }

    if (x.AGENTS_OBSERVATION_DISTANCE == "infinite") {
        agentObservationDistance = Number.MAX_SAFE_INTEGER
    } else {
        agentObservationDistance = x.AGENTS_OBSERVATION_DISTANCE
    }
})

/** @type {Me} */
export const me = {}

/**
 * @type {Array<Array<number>>} - the map of the game
 * 0 - NoZone
 * 1 - Walkable
 * 2 - Delivery
 */
export const grid = []

/** @type {pf.Grid | undefined} */
export var pathFindingGrid = undefined

client.onYou(({ id, name, x, y, score }) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
})

// @type {Map<string, Rival>}
export const rivals = new Map()
client.onAgentsSensing(async (_rivals) => {
    for (const delivery of deliveries) {
        delivery.isBlocked = false
    }

    for (const p of _rivals) {
        p.x = Math.round(p.x)
        p.y = Math.round(p.y)
        rivals.set(p.id, p)
        const d = deliveries.find((d) => {
            return d.x == p.x && d.y == p.y
        })
        if (d) {
            d.isBlocked = true
        }
    }
})

client.onMap((width, height) => {
    if (grid.length == 0) {
        for (let i = 0; i < width; i++) {
            const col = []
            for (let j = 0; j < height; j++) {
                col.push(1)
            }
            grid.push(col)
        }
    }

    if (pathFindingGrid == undefined) {
        pathFindingGrid = new pf.Grid(width, height)
    }
})

/** @type {Map<number, Parcel>} */
export const parcels = new Map()
/** @type {Array<Parcel>} */
var myParcels = []
client.onParcelsSensing(async (perceived_parcels) => {
    parcels.clear()
    myParcels = []

    for (const p of perceived_parcels) {
        p.created_at = Date.now()
        parcels.set(p.id, p)

        if (p.carriedBy == me.id) {
            myParcels.push(p)
        }
    }
})

/** @type {Array<Delivery>} */
export const deliveries = []
client.onTile(async (x, y, delivery) => {
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

    pathFindingGrid.setSolid(x, y, true)
})

function agentLoop() {
    if (pathFindingGrid == undefined) {
        return
    }

    calculatePaths()

    /** @type {Array<Option>} */
    const options = []

    const parcelsToDelete = []

    for (const parcel of parcels.values()) {
        if (!parcel.carriedBy) {
            var parcelValueNow = parcel.reward

            if (speedParcel != 0) {
                parcelValueNow =
                    parcel.reward -
                    Math.round((Date.now() - parcel.created_at) / (speedParcel * 1000))
            }

            if (parcelValueNow > 0 && parcel.path.length > 0) {
                options.push({
                    action: "go_pick_up",
                    x: parcel.x,
                    y: parcel.y,
                    id: parcel.id,
                    value: parcelValueNow,
                    args: {
                        maxSteps:
                            speedParcel != 0 ? (parcelValueNow * speedParcel * 1000) / speed : 0,
                        path: parcel.path,
                    },
                })
            } else {
                parcelsToDelete.push(parcel.id)
            }
        }
    }

    // remove outdated parcels
    parcelsToDelete.forEach((p) => parcels.delete(p))

    deliveries.sort((a, b) => a.path.length - b.path.length)
    const validDeliveries = deliveries.filter((d) => {
        if (d.isBlocked == true) {
            return false
        }

        const path = d.path
        if (path.length == 0) return false

        return true
    })

    /** @type {Option} */
    var bestOptionPutDown
    if (validDeliveries.length > 0) {
        const bestDelivery = validDeliveries[0]
        bestOptionPutDown = {
            action: "go_put_down",
            x: bestDelivery.x,
            y: bestDelivery.y,
            id: `D(${bestDelivery.x}, ${bestDelivery.y})`,
            value: 0,
            args: { path: bestDelivery.path },
        }
    }

    /** @type {Option} */
    let bestOptionPickUp
    let bestScorePickUp = 0

    for (const option of options) {
        if (option.action == "go_pick_up") {
            const dist = option.args.path.length

            let score = getOptionScore(option, dist, rivals)
            if (score > bestScorePickUp) {
                bestOptionPickUp = option
                bestScorePickUp = score
            }
        }
    }

    if (bestOptionPickUp || bestOptionPutDown) {
        var potentialScorePickUp = 0
        var potentialScorePutDown = 0

        const actualScoreMyParcels =
            myParcels.length > 0 ? myParcels.map((p) => p.reward).reduce((a, b) => a + b) : 0

        if (bestOptionPickUp) {
            if (myParcels.length == maxParcels) {
                potentialScorePickUp = 0
            } else {
                if (speedParcel == 0) {
                    potentialScorePickUp = 1000 - bestOptionPickUp.args.path.length //distance(me, bestOptionPickUp)
                } else {
                    if (deliveries.length > 0) {
                        let deliveryNearby = [...deliveries.values()].sort(
                            (a, b) => a.path.length - b.path.length,
                        )[0]

                        potentialScorePickUp = Math.max(
                            0,
                            actualScoreMyParcels -
                                bestOptionPickUp.args.path.length +
                                bestOptionPickUp.value -
                                deliveryNearby.path.length,
                            //bestOptionPickUp.value / (distance(me, bestOptionPickUp) * minDistanceDel),
                            /*actualScoreMyParcels -
                                (distance(me, bestOptionPickUp) * speed) / 1000 +
                                bestOptionPickUp.value -
                                (minDistanceDel * speedParcel) / 1000,*/
                        )
                    }
                }
            }
        }

        if (bestOptionPutDown) {
            if (myParcels.length == 0) {
                bestOptionPutDown = 0
            } else {
                if (speedParcel == 0) {
                    potentialScorePutDown = 1000 - 0 - bestOptionPutDown.args.path.length //distance(me, bestOptionPutDown)
                } else {
                    potentialScorePutDown = Math.max(
                        0,
                        actualScoreMyParcels - bestOptionPutDown.args.path.length,
                    )
                }
            }
        }

        logger.info(`bestOptionPutDown: ${potentialScorePutDown}`)
        logger.info(`bestOptionPickUp: ${potentialScorePickUp}`)

        if (
            (potentialScorePickUp != 0 || potentialScorePutDown != 0) &&
            (bestOptionPickUp || bestOptionPutDown)
        ) {
            let bestOption =
                potentialScorePickUp > potentialScorePutDown ? bestOptionPickUp : bestOptionPutDown

            myAgent.push(bestOption)
        } else {
            logger.info("bestOption is go random")

            const goRandomOption = {
                action: "go_random",
                id: "random",
            }

            myAgent.push(goRandomOption)
        }
    } else {
        logger.info("bestOption is go random")

        const goRandomOption = {
            action: "go_random",
            id: "random",
        }

        myAgent.push(goRandomOption)
    }
    return new Promise((res) => setImmediate(() => res()))
}

function calculatePaths() {
    // parcels
    for (var parcel of parcels.values()) {
        if (parcel.carriedBy == null) {
            const path = finder.findPath(
                { x: Math.round(me.x), y: Math.round(me.y) },
                parcel,
                pathFindingGrid,
            )
            parcel.path = path.path
            parcels.set(parcel.id, parcel)
        }
    }

    // deliveries
    for (var i = 0; i < deliveries.length; i++) {
        const delivery = deliveries[i]
        const path = finder.findPath(
            { x: Math.round(me.x), y: Math.round(me.y) },
            delivery,
            pathFindingGrid,
        )
        delivery.path = path.path
        deliveries[i] = delivery
    }
}
/*
client.onAgentsSensing(agentLoop)
client.onParcelsSensing(agentLoop)
client.onYou(agentLoop)
*/

const run = async () => {
    for (;;) {
        await agentLoop()
        await sleep(speed)
    }
}

run()

export function getPddlObjects() {
    var pddlGrid = ""
    for (let y = 0; y < pathFindingGrid.height; y++) {
        for (let x = 0; x < pathFindingGrid.width; x++) {
            if (!pathFindingGrid.get(x, y).solid) {
                pddlGrid += `y${y}_x${x} - position `
            }
        }
    }
    /*
    for (const parcel of parcels) {
        pddlGrid += `${parcel.id} - parcel `
    }
    */

    pddlGrid += `${me.id} - agent `
    return pddlGrid
}

export function getPddlInit() {
    var pddlString = ""

    for (let y = 0; y < pathFindingGrid.height; y++) {
        for (let x = 0; x < pathFindingGrid.width; x++) {
            if (!pathFindingGrid.get(x, y).solid) {
                if (y > 0 && !pathFindingGrid.get(x, y - 1).solid) {
                    pddlString += `(can-move y${y}_x${x} y${y - 1}_x${x}) `
                }
                if (x > 0 && !pathFindingGrid.get(x - 1, y).solid) {
                    pddlString += `(can-move y${y}_x${x} y${y}_x${x - 1}) `
                }
                if (y < pathFindingGrid.height - 1 && !pathFindingGrid.get(x, y + 1).solid) {
                    pddlString += `(can-move y${y}_x${x} y${y + 1}_x${x}) `
                }
                if (x < pathFindingGrid.width - 1 && !pathFindingGrid.get(x + 1, y).solid) {
                    pddlString += `(can-move y${y}_x${x} y${y}_x${x + 1}) `
                }
            }
        }
    }

    for (const delivery of deliveries) {
        pddlString += `(delivery y${delivery.y}_x${delivery.x}) `
    }

    /*
    for (const parcel of parcels) {
        if (parcel) {
            pddlString += `(at ${parcel.id} y${parcel.y}-x${parcel.x}) `
        }
    }
    */

    pddlString += `(blocked y${Math.round(me.y)}_x${Math.round(me.x)}) `

    pddlString += `(at ${me.id} y${Math.round(me.y)}_x${Math.round(me.x)}) `

    return pddlString
}
