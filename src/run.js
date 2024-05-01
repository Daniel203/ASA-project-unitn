import { DeliverooApi } from "@unitn-asa/deliveroo-js-client"
import { distance, sleep } from "./utils.js"
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

client.onConnect(async () => {
    let { astar } = await import("./path_finding.js")

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
            console.log(x + " " + y)
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

    /**
     * BDI loop
     */
    function agentLoop() {
        const options = []
        for (const parcel of parcels.values())
            if (!parcel.carriedBy) options.push(["go_pick_up", parcel.x, parcel.y, parcel.id])
        // myAgent.push( [ 'go_pick_up', parcel.x, parcel.y, parcel.id ] )

        /**
         * Options filtering
         */
        let best_option
        let nearest = Number.MAX_VALUE
        for (const option of options) {
            if (option[0] == "go_pick_up") {
                let [go_pick_up, x, y, id] = option
                let current_d = distance({ x, y }, me)
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

        console.log("unica cosa imortante, il path finding")
        console.log(me)
        console.log(best_option)
        console.log(astar(me, best_option, grid))

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
