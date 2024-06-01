import {
    client,
    me,
    grid,
    speed,
    pathFindingGrid,
    getPddlObjects,
    getPddlInit,
    rivals,
    parcels,
    deliveries,
    spawningPoints,
} from "./run.js"
import { Intention } from "./intention.js"
import { logger } from "./logger.js"
import { sleep, getExecutionTime } from "./utils.js"
import PddlProblem from "./planner/PddlProblem.js"
import { getPlan } from "./planner/pddl_planner.js"
import PddlExecutor from "./planner/pddl_executor.js"

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
        const parcel = parcels.get(desire.id)
        if (parcel && parcel.carriedBy && parcel.carriedBy !== me.id) {
            return false
        }

        return true
    }

    async executeWithSignal({ x, y, args }, signal) {
        try {
            // await this.subIntention("go_to", { x, y, action: "go_to", args })
            //
            // if (Math.round(me.x) === x && Math.round(me.y) === y) {
            //     await client.pickup()
            // }

            const pddlGoal = `and (carrying ${me.id} ${args.parcelId})`
            await this.subIntention("pddl_plan", { action: "pddl_plan", args: { pddlGoal } })
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
            // await this.subIntention("go_to", { x, y, action: "go_to" })
            //
            // if (Math.round(me.x) === x && Math.round(me.y) === y) {
            //     await client.putdown()
            // }

            var pddlGoal = "and "
            for (const parcelId of args.parcelsToDeliver) {
                pddlGoal += `(delivered ${parcelId}) `
            }
            await this.subIntention("pddl_plan", { action: "pddl_plan", args: { pddlGoal } })
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

            while (
                // xRand == undefined ||
                // yRand == undefined ||
                // grid[xRand][yRand] === 0 ||
                path.length === 0
            ) {
                // Pick a random value from the list
                const point = spawningPoints[Math.floor(Math.random() * spawningPoints.length)]

                xRand = point.x
                yRand = point.y

                path = finder.findPath(
                    { x: Math.round(me.x), y: Math.round(me.y) },
                    { x: xRand, y: yRand },
                    pathFindingGrid,
                ).path
            }

            // console.log(`Random point: (${xRand}, ${yRand})`)

            // await this.subIntention("go_to", { x: xRand, y: yRand, action: "go_to" })

            const pddlGoal = `and (at ${me.id} y${yRand}_x${xRand})`
            //console.log("RANDOM: ", pddlGoal)
            await this.subIntention("pddl_plan", { action: "pddl_plan", args: { pddlGoal } })
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
class PddlPlan extends Plan {
    /**
     * @param {Option} desire
     * @returns {boolean}
     */
    isApplicableTo(desire) {
        return true
    }

    async executeWithSignal({ x, y, args }, signal) {
        try {
            const pddlGoal = args.pddlGoal
            const pddlProblem = new PddlProblem(
                "pddl_plan",
                getPddlObjects(),
                getPddlInit(),
                pddlGoal,
            )

            const pddlPlan = await getPlan(pddlProblem.toPddlString())
            const pddlExecutor = new PddlExecutor(pddlPlan)
            const intentions = pddlExecutor.getIntentionsList()

            for (const intention of intentions) {
                await this.subIntention("pddl_plan", intention)
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

/** @extends Plan */
class BlindMove extends Plan {
    /**
     * @param {Option} desire
     * @returns {boolean}
     */
    isApplicableTo(desire) {
        return true
    }

    async executeWithSignal({ x, y, args }, signal) {
        const maxAttempts = 10
        var attempts = 0

        while (Math.round(me.x) !== x || Math.round(me.y) !== y) {
            if (attempts >= maxAttempts) {
                throw new Error(
                    `Impossible to reach the end of the path, it should be (${x}, ${y}) but it is (${Math.round(me.x)},${Math.round(me.y)})`,
                )
            }

            if (Math.round(me.x) < x) {
                client.move("right")
            } else if (Math.round(me.x) > x) {
                client.move("left")
            } else if (Math.round(me.y) < y) {
                client.move("up")
            } else if (Math.round(me.y) > y) {
                client.move("down")
            }

            await sleep(speed)
            attempts++
        }
    }
}

/** @extends Plan */
class PickUp extends Plan {
    /**
     * @param {Option} desire
     * @returns {boolean}
     */
    isApplicableTo(desire) {
        const parcel = parcels.get(desire.id)
        if (parcel && parcel.carriedBy && parcel.carriedBy !== me.id) {
            return false
        }

        return true
    }

    async executeWithSignal({ x, y, args }, signal) {
        client.pickup()
    }

    #name = "pick_up"
    get name() {
        return this.#name
    }
}

/** @extends Plan */
class PutDown extends Plan {
    /**
     * @param {Option} desire
     * @returns {boolean}
     */
    isApplicableTo(desire) {
        return true
    }

    async executeWithSignal({ x, y, args }, signal) {
        client.putdown()
    }

    #name = "put_up"
    get name() {
        return this.#name
    }
}

plans["go_pick_up"] = new GoPickUp()
plans["go_to"] = new BlindMove()
plans["go_put_down"] = new GoPutDown()
plans["go_random"] = new GoRandom()
plans["pddl_plan"] = new PddlPlan()
plans["pick_up"] = new PickUp()
plans["put_down"] = new PutDown()
