import { client, me, grid, deliveries, noZone, parcels, rivals, Intention } from "./run.js"
import { astar } from "./path_finding.js"
import { getDirections, distance, sleep, getOptionScore, getNearestDelivery } from "./utils.js"

/** @type {Map<string, Plan>} */
export const plans = new Map()

/**
 * @class Plan
 * @classdesc A plan is a high level abstraction of a sequence of intentions
 */
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

    isApplicableTo(desire) {
        return true
    }

    async execute({ x, y }) { }

    getPlanName() {
        return "plan"
    }
}

class GoPickUp extends Plan {
    isApplicableTo(desire) {
        return true
    }

    async execute({ x, y }) {
        try {
            await this.subIntention("go_to", { x, y, action: "go_to" })
            // await sleep(250)

            await client.pickup()
            // await sleep(250)
        } catch (error) {
            this.stop()
        }
    }


    getPlanName() {
        return "go_pick_up"
    }
}

class GoPutDown extends Plan {
    isApplicableTo(desire) {
        return true
    }

    async execute({ x, y }) {
        try {
            await this.subIntention("go_to", { x, y, action: "go_to" })
            // await sleep(250)
            await client.putdown()
            // await sleep(250)
        } catch (error) {
            this.stop()
        }
    }

    getPlanName() {
        return "go_put_down"
    }
}

class BlindMove extends Plan {
    isApplicableTo(desire) {
        return true
    }

    async execute({ x, y }) {
        const path = astar(me, { x: x, y: y }, grid)

        const maxAttempts = 5
        var attempts = 0

        var i = 0
        while (i < path.length) {
            const coord = path[i]

            if (me.x == coord.x - 1) {
                await client.move("right")
            } else if (me.x == coord.x + 1) {
                await client.move("left")
            } else if (me.y == coord.y - 1) {
                await client.move("up")
            } else if (me.y == coord.y + 1) {
                await client.move("down")
            }

            if (me.x !== coord.x && me.y !== coord.y && attempts < maxAttempts) {
                attempts++
                throw new Error("Impossible to reach the end of the path")
            } else {
                i++
                attempts = 0
            }
        }
    }

    getPlanName() {
        return "go_to"
    }
}

plans["go_pick_up"] = new GoPickUp()
plans["go_to"] = new BlindMove()
plans["go_put_down"] = new GoPutDown()
