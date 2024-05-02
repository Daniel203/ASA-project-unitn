import { DeliverooApi } from "@unitn-asa/deliveroo-js-client"
import { distance, sleep, getDirections, getScoreOption } from "./utils.js"
import "./types.js"

export const client = new DeliverooApi(
    "http://localhost:8080",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA3MTg1ZTA5YmZlIiwibmFtZSI6ImRhbmllbCIsImlhdCI6MTcxNDQyMTc5MH0.XemKVJ2TGJ70go2oN1oiQKKpMGF-JFOwSEitlTpw4FA",
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

const parcels = new Map()
client.onParcelsSensing(async (perceived_parcels) => {
    for (const p of perceived_parcels) {
        parcels.set(p.id, p)
    }
})

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

client.onConnect(async () => {
    let { astar } = await import("./path_finding.js")

    /**
     * BDI loop
     */
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
        // myAgent.push( [ 'go_pick_up', parcel.x, parcel.y, parcel.id ] )

        /**
         * Options filtering
         */

        /** @type Option */
        let best_option

        let nearest = Number.MAX_VALUE
        for (const option of options) {
            if (option.action == "go_pick_up") {
                let dist = distance(me, option)
                let current_d = getScoreOption(option, dist, option.value, rivals)
                console.log(current_d)
                if (current_d < nearest) {
                    best_option = option
                    nearest = current_d
                }
            }
        }

        /**
         * Best option is selected
         */
        // if (best_option) myAgent.push(best_option)

        if (best_option) {
            console.log(me)
            console.log(best_option)
            const path = astar(me, { x: best_option.x, y: best_option.y }, grid)
            path.push({ x: me.x, y: me.y })
            console.log(path)
            console.log()
            const directions = getDirections(path)
            for (const direction of directions) {
                for (const delivery in deliveries.values) {
                    if (me.x == delivery.x && me.y == delivery.y) {
                        await client.putdown()
                    }
                }
                await client.move(direction)
            }
            await client.pickup()
        }

        /**
         * Options
         */
        /**
         * Select best intention
         */
        /**
         * Revise/queue intention
         */
    }
    client.onParcelsSensing(agentLoop)
    // client.onAgentsSensing( agentLoop )
    // client.onYou( agentLoop )

    /**
     * Intention revision / execution loop
     */
    class Agent {
        intention_queue = new Array()

        async intentionLoop() {
            for (;;) {
                const intention = this.intention_queue.shift()
                if (intention) await intention.achieve()
                await new Promise((res) => setImmediate(res))
            }
        }

        async queue(desire, ...args) {
            const last = this.intention_queue.at(this.intention_queue.length - 1)
            const current = new Intention(desire, ...args)
            this.intention_queue.push(current)
        }

        async stop() {
            console.log("stop agent queued intentions")
            for (const intention of this.intention_queue) {
                intention.stop()
            }
        }
    }
    const myAgent = new Agent()
    myAgent.intentionLoop()

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
})
