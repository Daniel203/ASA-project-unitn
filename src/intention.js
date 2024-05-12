import { logger } from "./logger.js"
// eslint-disable-next-line no-unused-vars
import { plans, Plan } from "./plan.js"

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
     *  @param {Agent} parent
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
                logger.info(
                    `Executing plan "${this.#current_plan.name}" for intention ${JSON.stringify(this.predicate)}`,
                )
                
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
