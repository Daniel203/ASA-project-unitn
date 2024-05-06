import { client, me, grid, speed, pathFindingGrid} from "./run.js"
import { Intention } from "./intention.js"

import * as pf from "@cetfox24/pathfinding-js"


/** @type {Map<string, Plan>} */
export const plans = new Map()

/** @type {pf.AStar} */
const finder = new pf.AStar()

/**
 * @class Plan
 * @classdesc A plan is a high level abstraction of a sequence of intentions
 */
export class Plan {
    #stopped = false

    get stopped() {
        return this.#stopped
    }

    stop() {
        console.log("stop plan and all sub intentions, ", this)
        this.#stopped = true
        for (const i of this.#sub_intentions) {
            i.stop()
        }
    }

    /** @type {Intention[]} */
    #sub_intentions = []

    async subIntention(desire, ...args) {
        const sub_intention = new Intention(desire, ...args)
        this.#sub_intentions.push(sub_intention)
        return await sub_intention.achieve()
    }

    isApplicableTo(desire) {
        return true
    }

    async execute({ x, y }) {}

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

            if (Math.round(me.x) === x && Math.round(me.y) === y) {
                await client.pickup()
            }
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

            if (Math.round(me.x) === x && Math.round(me.y) === y) {
                await client.putdown()
            }
        } catch (error) {
            this.stop()
        }
    }

    getPlanName() {
        return "go_put_down"
    }
}

class GoRandom extends Plan {
    isApplicableTo(desire) {
        return true
    }

    async execute() {
        try {
            while (this.stopped === false) {
                // pick a random point in the map
                const x = Math.floor(Math.random() * grid.length)
                const y = Math.floor(Math.random() * grid[0].length)

                if (grid[x][y] !== 0) {
                    await this.subIntention("go_to", { x, y, action: "go_to" })
                }
            }
        } catch (error) {
            this.stop()
        }
    }

    getPlanName() {
        return "go_random"
    }
}

class BlindMove extends Plan {
    isApplicableTo(desire) {
        return true
    }

    async execute({ x, y }) {
        const path = finder.findPath(me, { x: x, y: y }, pathFindingGrid)

        const maxAttempts = (1000 / speed) * 10
        var attempts = 0

        var i = 0
        while (i < path.path.length) {
            const coord = path.path[i]
            const x = Math.round(me.x)
            const y = Math.round(me.y)

            if (x == coord.x - 1) {
                await client.move("right")
            } else if (x == coord.x + 1) {
                await client.move("left")
            } else if (y == coord.y - 1) {
                await client.move("up")
            } else if (y == coord.y + 1) {
                await client.move("down")
            }

            if (Math.round(x) !== coord.x && Math.round(y) !== coord.y) {
                if (attempts === maxAttempts) {
                    throw new Error(
                        `Impossible to reach the end of the path, it should be (${coord.x}, ${coord.y}) but it is (${x},${y})`,
                    )
                }

                attempts++
                console.log("retry n:", attempts)
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
plans["go_random"] = new GoRandom()
