import { client, me, grid, speed, pathFindingGrid, rivals, parcels } from "./run.js"
import { Intention } from "./intention.js"
import { logger } from "./logger.js"

import * as pf from "@cetfox24/pathfinding-js"

/** @type {Map<string, Plan>} */
export const plans = new Map()

/** @type {pf.AStar} */
const finder = new pf.AStar()

/**
 * @classdesc A plan is a high level abstraction of a sequence of intentions
 */
export class Plan {
    // #stopped = false
    // get stopped() {
    //     return this.#stopped
    // }

    #abortController = new AbortController()

    stop() {
        logger.info(
            `stop plan and all sub intentions, ${this.#sub_intentions.forEach((i) => JSON.stringify(i.predicate))}`,
        )
        this.#abortController.abort()
        for (const i of this.#sub_intentions) {
            i.stop()
        }
    }

    /** @type {Intention[]} */
    #sub_intentions = []

    /**
     * @param {string} desire
     * @param  {Option} args
     * @returns {Promise<any>}
     */
    async subIntention(desire, ...args) {
        const sub_intention = new Intention(desire, ...args)
        this.#sub_intentions.push(sub_intention)
        return await sub_intention.achieve()
    }

    /**
     * @param {Option} desire
     * @returns {boolean}
     */
    isApplicableTo(desire) {
        return true
    }

    async execute({ x, y, args }) {
        try {
            await this.executeWithSignal({ x, y, args }, this.#abortController.signal)
        } catch (error) {
            if (error.name !== "AbortError") {
                logger.error(`Error in plan: ${JSON.stringify(error)}`)
                throw error
            }
        } finally {
            this.#abortController = new AbortController()
        }
    }

    async executeWithSignal({ x, y, args }, signal) {}

    get name() {
        return "plan"
    }
}

/** @extends Plan */
class GoPickUp extends Plan {
    async executeWithSignal({ x, y, args }, signal) {
        try {
            await this.subIntention("go_to", { x, y, action: "go_to", args })

            if (Math.round(me.x) === x && Math.round(me.y) === y) {
                await client.pickup()
            }
        } catch (error) {
            logger.error(`Error in go_pick_up: ${JSON.stringify(error)}`)
            this.stop()
        }
    }

    get name() {
        return "go_pick_up"
    }
}

/** @extends Plan */
class GoPutDown extends Plan {
    async executeWithSignal({ x, y, args }, signal) {
        try {
            await this.subIntention("go_to", { x, y, action: "go_to" })

            if (Math.round(me.x) === x && Math.round(me.y) === y) {
                await client.putdown()
            }
        } catch (error) {
            logger.error(`Error in go_put_down: ${JSON.stringify(error)}`)
            this.stop()
        }
    }

    get name() {
        return "go_put_down"
    }
}

/** @extends Plan */
class GoRandom extends Plan {
    async executeWithSignal({ x, y, args }, signal) {
        try {
            // pick a random point in the map
            const x = Math.floor(Math.random() * grid.length)
            const y = Math.floor(Math.random() * grid[0].length)

            if (grid[x][y] !== 0) {
                logger.info(`(${x}, ${y})`)
                await this.subIntention("go_to", { x, y, action: "go_to" })
            }
        } catch (error) {
            logger.error(`Error in go_random: ${JSON.stringify(error)}`)
            this.stop()
        }
    }

    get name() {
        return "go_random"
    }
}

/** @extends Plan */
class BlindMove extends Plan {
    /**
     * @param {Option} desire
     * @returns {boolean}
     */
    isApplicableTo(desire) {
        if (desire.args?.maxSteps) {
            const path = finder.findPath(me, desire, pathFindingGrid)
            if (path.length > desire.args.maxSteps) {
                return false
            }
        }

        logger.info(`desire ${JSON.stringify(desire)} is applicable`)
        return true
    }

    async executeWithSignal({ x, y, args }, signal) {
        try {
            const maxAttempts = (1000 / speed) * 5
            var attempts = 0

            const path = finder.findPath(me, { x, y }, pathFindingGrid)

            var i = 0
            while (i < path.length) {
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

                if (
                    [...parcels.values()].some(
                        (p) => p.x == Math.round(me.x) && p.y == Math.round(me.y),
                    )
                ) {
                    await client.pickup()
                }

                if (Math.round(x) !== coord.x && Math.round(y) !== coord.y) {
                    if (attempts === maxAttempts) {
                        throw new Error(
                            `Impossible to reach the end of the path, it should be (${coord.x}, ${coord.y}) but it is (${x},${y})`,
                        )
                    }

                    attempts++
                    logger.info(`retry n: ${attempts}`)
                } else {
                    i++
                    attempts = 0
                }
            }
        } catch (error) {
            logger.error(`Error in go_to: ${JSON.stringify(error)}`)
            this.stop()
        }
    }
}

plans["go_pick_up"] = new GoPickUp()
plans["go_to"] = new BlindMove()
plans["go_put_down"] = new GoPutDown()
plans["go_random"] = new GoRandom()
