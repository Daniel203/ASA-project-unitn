import { parcels, me } from "./run.js"
import { plans, Plan} from "./plan.js"
import {logger} from "./logger.js"

class IntentionRevision {
    /** @type {Array<Intention>} */
    #intention_queue = new Array()

    get intention_queue() {
        return this.#intention_queue
    }

    async loop() {
        for (;;) {
            if (this.intention_queue.length > 0) {
                const intention = this.intention_queue[0]

                if (intention.action === "go_pick_up") {
                    let id = intention.predicate.id
                    let p = parcels.get(id)

                    if (p && p.carriedBy) {
                        continue
                    }
                }

                await intention.achieve().catch((error) => {
                    logger.info("Failed intention", intention.predicate, "with error:", error)
                })

                this.intention_queue.shift()
            }

            // Postpone next iteration at setImmediate
            await new Promise((res) => setImmediate(res))
        }
    }

    log(...args) {
        logger.info(...args)
    }
}

class IntentionRevisionRevise extends IntentionRevision {
    async push(predicate) {
        // logger.info("Revising intention queue. Received", ...predicate)
        // - order intentions based on utility function (reward - cost) (for example, parcel score minus distance)
        // - eventually stop current one
        // - evaluate validity of intention

        // TODO: sort di go_pick_up in base alla distanza

        // Check if already queued
        if (this.intention_queue.find((i) => i.predicate.id == predicate.id)) {
            return
        }

        if (this.intention_queue.length > 0) {
            const currentIntention = this.intention_queue[0]

            if (currentIntention.predicate.action == "go_pick_up") {
                const parcel = parcels.get(currentIntention.predicate.id)

                if (!parcel || (parcel.carriedBy != null && parcel.carriedBy != me.id)) {
                    currentIntention.stop()
                }
            }

            if (currentIntention.predicate.action == "go_random") {
                if (predicate.action != "go_random") {
                    currentIntention.stop()
                }
            }
        }

        while (this.intention_queue.length > 0) {
            this.intention_queue.pop()
        }

        const intention = new Intention(this, predicate)
        this.intention_queue.push(intention)

        logger.info(`intention queue ${JSON.stringify(this.intention_queue.map((x) => x.predicate))}`)
    }
}

export const myAgent = new IntentionRevisionRevise()
myAgent.loop()

/**
 * @class Intention
 * @classdesc Intention is a class that represents a goal that the agent wants to achieve.
 */
export class Intention {
    // Plan currently used for achieving the intention
    /** @type {typeof Plan} */
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
     * @returns {Option}
     */
    get predicate() {
        return this.#predicate
    }

    /** @type {Option} */
    #predicate

    /**
     *  @param {IntentionRevision} parent
     *  @param {Option} predicate
     */
    constructor(parent, predicate) {
        this.#parent = parent
        this.#predicate = predicate
    }

    log(...args) {
        if (this.#parent && this.#parent.log) this.#parent.log("\t", ...args)
        else logger.info(...args)
    }

    #started = false
    /**
     * Using the plan library to achieve an intention
     */
    async achieve() {
        // Cannot start twice
        if (this.#started) return this
        else this.#started = true

        const plan = plans[this.#predicate.action]

        if (this.stopped) throw ["stopped intention", this.predicate]
        if (plan?.isApplicableTo(this.predicate)) {
            this.#current_plan = plan

            try {
                const plan_res = await this.#current_plan.execute(this.predicate)
                return plan_res
            } catch (error) {
                logger.error(error)
            }
        }

        if (this.stopped) throw ["stopped intention", this.predicate]

        throw ["no plan satisfied the intention ", this.predicate]
    }
}
