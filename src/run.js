import { DeliverooApi } from "@unitn-asa/deliveroo-js-client"
import { distance, sleep, getOptionScore, getNearestDelivery } from "./utils.js"
import "./types.js"
import { plans } from "./plan.js"

export const client = new DeliverooApi(
    "http://localhost:8080",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQzMDEzYjI3NTQ1IiwibmFtZSI6IlZDQVJCIiwiaWF0IjoxNzE0Njc5NjY3fQ.zTwxpdXyHHV2zes7Vw4-SFuLl120KC5XDAgqlgSOxb4",
)

/** @type Me */
export const me = {}

/**
 * @type Array<Array<number>> - the map of the game
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

/** @type Map<number, Parcel> */
export const parcels = new Map()
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
        var potentialScorePickUp = 0
        var potentialScorePutDown = 0

        const actualScoreMyParcels =
            myParcels.length > 0 ? myParcels.map((p) => p.reward).reduce((a, b) => a + b) : 0

        if (bestOptionPickUp) {
            //TODO: add rivals
            let minDistanceDel = getNearestDelivery(bestOptionPickUp, deliveries)
            potentialScorePickUp =
                actualScoreMyParcels -
                distance(me, bestOptionPickUp) * myParcels.length +
                bestOptionPickUp.value -
                minDistanceDel
        }

        if (bestOptionPutDown) {
            potentialScorePutDown = actualScoreMyParcels - distance(me, bestOptionPutDown)
        }

        let bestOption =
            potentialScorePickUp > potentialScorePutDown ? bestOptionPickUp : bestOptionPutDown

        if (bestOption) {
            myAgent.push(bestOption)
        }
    }
}

client.onParcelsSensing(agentLoop)

class IntentionRevision {
    #intention_queue = new Array()

    get intention_queue() {
        return this.#intention_queue
    }

    async loop() {
        for (;;) {
            // TODO: da implementare
            if (this.intention_queue.length > 0) {
                // Current intention
                const intention = this.intention_queue[0]

                // Is queued intention still valid? Do I still want to achieve it?
                // TODO this hard-coded implementation is an example
                console.log("Checking intention", intention.predicate)
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

    log(...args) {
        console.log(...args)
    }
}

class IntentionRevisionRevise extends IntentionRevision {
    async push(predicate) {
        // console.log("Revising intention queue. Received", ...predicate)
        // - order intentions based on utility function (reward - cost) (for example, parcel score minus distance)
        // - eventually stop current one
        // - evaluate validity of intention

        // TODO: da implementare, per ora aggiunge tutto senza logica

        // Check if already queued
        if (this.intention_queue.find((i) => i.predicate == predicate)) {
            return
        }

        console.log("IntentionRevisionReplace.push", predicate)
        const intention = await new Intention(this, predicate)
        console.log(`Pushing intention ${intention.predicate}`)
        this.intention_queue.push(intention)
    }
}

const myAgent = new IntentionRevisionRevise()
myAgent.loop()

export class Intention {
    // Plan currently used for achieving the intention
    #current_plan

    // This is used to stop the intention
    #stopped = false
    get stopped() {
        return this.#stopped
    }
    stop() {
        // this.log( 'stop intention', ...this.#predicate );
        this.#stopped = true
        if (this.#current_plan) this.#current_plan.stop()
    }

    /**
     * #parent refers to caller
     */
    #parent

    /**
     * @returns Option
     */
    get predicate() {
        return this.#predicate
    }

    /** @type Option */
    #predicate

    constructor(parent, predicate) {
        this.#parent = parent
        this.#predicate = predicate
    }

    log(...args) {
        if (this.#parent && this.#parent.log) this.#parent.log("\t", ...args)
        else console.log(...args)
    }

    #started = false
    /**
     * Using the plan library to achieve an intention
     */
    async achieve() {
        // Cannot start twice
        if (this.#started) return this
        else this.#started = true

        console.log("pr:" + this.#predicate.action)
        const plan = plans[this.#predicate.action]

        if (this.stopped) throw ["stopped intention", this.predicate]
        console.log(plan)
        if (plan?.isApplicableTo(this.predicate)) {
            console.log("prima di current plan")
            this.#current_plan = plan

            try {
                const plan_res = await this.#current_plan.execute(this.predicate)
                console.log("plan res", plan_res)
                return plan_res
                // or errors are caught so to continue with next plan
            } catch (error) {
                console.error(error)
            }
        }

        // if stopped then quit
        if (this.stopped) throw ["stopped intention", ...this.predicate]

        // no plans have been found to satisfy the intention
        // this.log( 'no plan satisfied the intention ', ...this.predicate );
        throw ["no plan satisfied the intention ", ...this.predicate]
    }
}
