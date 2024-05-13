import { client, me, grid, speed, pathFindingGrid, rivals, parcels, deliveries } from "./run.js"
import { Intention } from "./intention.js"
import { logger } from "./logger.js"
import { sleep } from "./utils.js"

import * as pf from "@cetfox24/pathfinding-js"

/** @type {Map<string, Plan>} */
export const plans = new Map()

/** @type {pf.AStar} */
const finder = new pf.AStar()

/**
 * @classdesc A plan is a high level abstraction of a sequence of intentions
 */
export class Plan {
    #abortController = new AbortController()

    stop() {
        logger.warn(`Stopping plan ${this.name}`)
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
                logger.error(`Error in plan: ${error}`)
                throw error
            }
        } finally {
            this.#abortController = new AbortController()
        }
    }

    async executeWithSignal({ x, y, args }, signal) {}

    #name = "plan"
    get name() {
        return this.#name
    }
}

/** @extends Plan */
class GoPickUp extends Plan {
    /**
     * @param {Option} desire
     * @returns {boolean}
     */
    isApplicableTo(desire) {
        /* for (const p of parcels.values()) {
            if (Math.round(p.x) == desire.x && Math.round(p.y) == desire.y) {
                return false
            }
        } */

        const parcel = parcels.get(desire.id)
        if (parcel && parcel.carriedBy && parcel.carriedBy !== me.id) {
            return false
        }

        return true
    }

    async executeWithSignal({ x, y, args }, signal) {
        try {
            await this.subIntention("go_to", { x, y, action: "go_to", args })

            if (Math.round(me.x) === x && Math.round(me.y) === y) {
                await client.pickup()
            }
        } catch (error) {
            logger.error(`Error in go_pick_up: ${error}`)
            this.stop()
            throw error
        }
    }

    #name = "go_pick_up"
    get name() {
        return this.#name
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
            logger.error(`Error in go_put_down: ${error}`)
            this.stop()
            throw error
        }
    }

    #name = "go_put_down"
    get name() {
        return this.#name
    }
}

/** @extends Plan */
class GoRandom extends Plan {
    isApplicableTo(desire) {
        return pathFindingGrid !== undefined
    }

    async executeWithSignal({ x, y, args }, signal) {
        try {
            var xRand = undefined
            var yRand = undefined

            /** @type {Array<Point>} */
            var path = []

            while (!xRand || !yRand || grid[xRand][yRand] === 0 || path.length === 0) {
                xRand = Math.floor(Math.random() * grid.length)
                yRand = Math.floor(Math.random() * grid[0].length)

                path = finder.findPath(
                    { x: Math.round(me.x), y: Math.round(me.y) },
                    { x: xRand, y: yRand },
                    pathFindingGrid,
                ).path
            }

            await this.subIntention("go_to", { x: xRand, y: yRand, action: "go_to" })
        } catch (error) {
            logger.error(`Error in go_random: ${error}`)
            this.stop()
            throw error
        }
    }

    #name = "go_random"
    get name() {
        return this.#name
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
            if (desire?.path?.length > desire?.args?.maxSteps) {
                return false
            }
        }

        logger.info(`desire ${JSON.stringify(desire)} is applicable`)
        return true
    }

    async executeWithSignal({ x, y, args }, signal) {
        try {
            // const maxAttempts = (1000 / speed) * 5
            const maxAttempts = 10
            var attempts = 0

            var path = []

            if (path[0]?.x == Math.round(me.x) && path[0]?.y == Math.round(me.y)) {
                path = args.path
            } else {
                path = finder.findPath(
                    { x: Math.round(me.x), y: Math.round(me.y) },
                    { x, y },
                    pathFindingGrid,
                ).path
            }

            var i = 0
            while (i < path.length) {
                const coord = path[i]
                var xMe = Math.round(me.x)
                var yMe = Math.round(me.y)

                /** @type {{x:number,y:number}|false} */
                var res = undefined

                if (xMe == coord.x - 1) {
                    res = await client.move("right")
                } else if (xMe == coord.x + 1) {
                    res = await client.move("left")
                } else if (yMe == coord.y - 1) {
                    res = await client.move("up")
                } else if (yMe == coord.y + 1) {
                    res = await client.move("down")
                }
                
                xMe = Math.round(me.x)
                yMe = Math.round(me.y)

                const isOverParcel = [...parcels.values()].some((p) => p.x == xMe && p.y == yMe)
                if (isOverParcel) {
                    await client.pickup()
                }

                const isOverDelivery = deliveries.some((d) => d.x == xMe && d.y == yMe)
                if (isOverDelivery) {
                    await client.putdown()
                }

                if (res === false) {
                    if (attempts === maxAttempts) {
                        throw new Error(
                            `Impossible to reach the end of the path, it should be (${coord.x}, ${coord.y}) but it is (${xMe},${yMe})`,
                        )
                    }

                    attempts++
                    logger.info(`retry ${attempts} / ${maxAttempts}`)
                } else {
                    i++
                    attempts = 0
                }

                /*  NOTE: removed this part because now we use the result of client.move to check if the movement was successful
                xMe = Math.round(me.x)
                yMe = Math.round(me.y)

                const isOverParcel = [...parcels.values()].some((p) => p.x == xMe && p.y == yMe)
                if (isOverParcel) {
                    await client.pickup()
                }

                const isOverDelivery = deliveries.some((d) => d.x == xMe && d.y == yMe)
                if (isOverDelivery) {
                    await client.putdown()
                }
                */

                /*
                if (xMe !== coord.x && yMe !== coord.y) {
                    if (attempts === maxAttempts) {
                        throw new Error(
                            `Impossible to reach the end of the path, it should be (${coord.x}, ${coord.y}) but it is (${xMe},${yMe})`,
                        )
                    }

                    attempts++
                    logger.info(`retry ${attempts} / ${maxAttempts}`)
                } else {
                    i++
                    attempts = 0
                }
                */
            }
        } catch (error) {
            logger.error(`Error in go_to: ${error}`)
            this.stop()
            throw error
        }
    }

    #name = "go_to"
    get name() {
        return this.#name
    }
}

plans["go_pick_up"] = new GoPickUp()
plans["go_to"] = new BlindMove()
plans["go_put_down"] = new GoPutDown()
plans["go_random"] = new GoRandom()
