import { DeliverooApi } from "@unitn-asa/deliveroo-js-client"
import { distance, sleep, getDirections, getOptionScore } from "./utils.js"
import "./types.js"
import { astar } from "./path_finding.js"

export const client = new DeliverooApi(
    "http://localhost:8080",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQzMDEzYjI3NTQ1IiwibmFtZSI6IlZDQVJCIiwiaWF0IjoxNzE0Njc5NjY3fQ.zTwxpdXyHHV2zes7Vw4-SFuLl120KC5XDAgqlgSOxb4",
)

/** @type Me */
const me = {}

/**
 * @type Array<Array<number>> - the map of the game
 * 0 - NoZone
 * 1 - Walkable
 * 2 - Delivery
 */
const grid = []

client.onYou(({ id, name, x, y, score }) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
})

const rivals = new Map()
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

/** @type Map<number, Parcel> */
const parcels = new Map()
/** @type Array<Parcel> */
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

/** @type Array<Point> */
const deliveries = []
client.onTile(async (x, y, delivery, parcel) => {
    if (grid.length == 0) await sleep(1000)

    if (delivery) {
        deliveries.push({ x: x, y: y })
        grid[x][y] = 2
    }
})

const noZone = []
client.onNotTile(async (x, y) => {
    if (grid.length == 0) await sleep(1000)

    noZone.push({ x: x, y: y })
    grid[x][y] = 0
})

async function agentLoop() {
    /** @type Array<Option> */
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

    const sortedDeliveries = deliveries.sort((a, b) => distance(me, a) - distance(me, b))
    var bestOptionPutDown
    if (sortedDeliveries.length > 0) {
        const bestDelivery = sortedDeliveries[0]
        bestOptionPutDown = {
            action: "go_put_down",
            x: bestDelivery.x,
            y: bestDelivery.y,
            id: `D(${bestDelivery.x}, ${bestDelivery.y})`,
            value: 0,
        }
    }

    /** @type Option */
    let bestOptionPickUp
    let bestScorePickUp = 0

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
        var potentialScorePickUp = 0
        var potentialScorePutDown = 0

        const actualScoreMyParcels =
            myParcels.length > 0 ? myParcels.map((p) => p.reward).reduce((a, b) => a + b) : 0

        if (bestOptionPickUp) {
            potentialScorePickUp =
                actualScoreMyParcels -
                distance(me, bestOptionPickUp) * myParcels.length +
                bestOptionPickUp.value
        }

        if (bestOptionPutDown) {
            potentialScorePutDown =
                actualScoreMyParcels - (distance(me, bestOptionPutDown) * myParcels.length) / 2
        }

        console.log(
            `(${bestOptionPickUp}-${potentialScorePickUp})     (${bestOptionPutDown}-${potentialScorePutDown})`,
        )
        await sleep(1000)
        //myAgent.push(best_option)
    }

    /* TODO: da spostare nella parte di plans
    if (best_option) {
        const path = astar(me, { x: best_option.x, y: best_option.y }, grid)
        path.push({ x: me.x, y: me.y })

        const directions = getDirections(path)
        for (const direction of directions) {
            for (const delivery of deliveries) {
                if (me.x == delivery.x && me.y == delivery.y) {
                    await client.putdown()
                }
            }
            await client.move(direction)
        }
        await client.pickup()
    }
    */
}

client.onParcelsSensing(agentLoop)

class IntentionRevision {
    #intention_queue = new Array()
    get intention_queue() {
        return this.#intention_queue
    }

    async loop() {
        while (true) {
            // Consumes intention_queue if not empty
            if (this.intention_queue.length > 0) {
                console.log(
                    "intentionRevision.loop",
                    this.intention_queue.map((i) => i.predicate),
                )

                // Current intention
                const intention = this.intention_queue[0]

                // Is queued intention still valid? Do I still want to achieve it?
                // TODO this hard-coded implementation is an example
                let id = intention.predicate[2]
                let p = parcels.get(id)
                if (p && p.carriedBy) {
                    console.log("Skipping intention because no more valid", intention.predicate)
                    continue
                }

                // Start achieving intention
                await intention
                    .achieve()
                    // Catch eventual error and continue
                    .catch((error) => {
                        // console.log( 'Failed intention', ...intention.predicate, 'with error:', ...error )
                    })

                // Remove from the queue
                this.intention_queue.shift()
            }
            // Postpone next iteration at setImmediate
            await new Promise((res) => setImmediate(res))
        }
    }

    // async push ( predicate ) { }

    log(...args) {
        console.log(...args)
    }
}

class IntentionRevisionQueue extends IntentionRevision {
    async push(predicate) {
        // Check if already queued
        if (this.intention_queue.find((i) => i.predicate.join(" ") == predicate.join(" "))) return // intention is already queued

        console.log("IntentionRevisionReplace.push", predicate)
        const intention = new Intention(this, predicate)
        this.intention_queue.push(intention)
    }
}

class IntentionRevisionReplace extends IntentionRevision {
    async push(predicate) {
        // Check if already queued
        const last = this.intention_queue.at(this.intention_queue.length - 1)
        if (last && last.predicate.join(" ") == predicate.join(" ")) {
            return // intention is already being achieved
        }

        console.log("IntentionRevisionReplace.push", predicate)
        const intention = new Intention(this, predicate)
        this.intention_queue.push(intention)

        // Force current intention stop
        if (last) {
            last.stop()
        }
    }
}

class IntentionRevisionRevise extends IntentionRevision {
    async push(predicate) {
        console.log("Revising intention queue. Received", ...predicate)
        // TODO
        // - order intentions based on utility function (reward - cost) (for example, parcel score minus distance)
        // - eventually stop current one
        // - evaluate validity of intention
    }
}

const myAgent = new IntentionRevisionRevise()
myAgent.loop()

/**
 * Intention
 */
class Intention extends Promise {
    #current_plan
    stop() {
        console.log("stop intention and current plan")
        this.#current_plan.stop()
    }

    #desire
    #args

    #resolve
    #reject

    constructor(desire, ...args) {
        var resolve, reject
        super(async (res, rej) => {
            resolve = res
            reject = rej
        })
        this.#resolve = resolve
        this.#reject = reject
        this.#desire = desire
        this.#args = args
    }

    #started = false
    async achieve() {}
}

/**
 * Plan library
 */
const plans = []

class Plan {
    stop() {
        console.log("stop plan and all sub intentions")
        for (const i of this.#sub_intentions) {
            i.stop()
        }
    }

    #sub_intentions = []

    async subIntention(desire, ...args) {
        const sub_intention = new Intention(desire, ...args)
        this.#sub_intentions.push(sub_intention)
        return await sub_intention.achieve()
    }
}

class GoPickUp extends Plan {
    isApplicableTo(desire) {}

    async execute({ x, y }) {}
}

class BlindMove extends Plan {
    isApplicableTo(desire) {}

    async execute({ x, y }) {}
}

plans.push(new GoPickUp())
plans.push(new BlindMove())
