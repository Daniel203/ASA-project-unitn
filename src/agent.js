import { parcels, me } from "./run.js"
import { logger } from "./logger.js"
import { Intention } from "./intention.js"

class Agent {
    /** @type {Array<Intention>} */
    #intention_queue = new Array()

    get intention_queue() {
        return this.#intention_queue
    }

    /** @type {Intention | null} */
    #current_intention = null

    get current_intention() {
        return this.#current_intention
    }

    /** @type {Intention | null} */
    #last_rejected_intention = null

    get last_rejected_intention() {
        return this.#last_rejected_intention
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

                this.#current_intention = intention
                try {
                    await intention.achieve()
                    this.#last_rejected_intention = null
                } catch (error) {
                    logger.warn(`${error}`)
                    if (intention?.predicate?.id && intention?.predicate?.id.length > 0 && intention?.predicate?.id[0] == "D") {
                        this.#last_rejected_intention = intention
                        logger.error(
                            `last removed intention: ${JSON.stringify(this.last_rejected_intention.predicate)}`,
                        )
                    } else {
                        this.#last_rejected_intention = null
                    }
                } finally {
                    this.intention_queue.shift()
                    this.#current_intention = null
                }
            }

            // Postpone next iteration at setImmediate
            await new Promise((res) => setImmediate(res))
        }
    }

    log(...args) {
        logger.info(...args)
    }

    async push(predicate) {
        try{
            logger.info(
                `intention queue before: ${JSON.stringify(this.intention_queue.map((x) => x.predicate))}`,
            )

            logger.info(`last intention: ${JSON.stringify(this.current_intention?.predicate)}`)

            // TODO: check if it works
            /*if (this.last_rejected_intention?.predicate?.id === predicate.id) {
                logger.warn(`This intention has just got been rejected: ${JSON.stringify(predicate)}`)
                return
            }*/

            if (this.intention_queue.find((i) => i.predicate.id == predicate.id)) {
                logger.warn(`Intention already in queue: ${JSON.stringify(predicate)}`)
                return
            }

            logger.info(`Intention not in queue: ${JSON.stringify(predicate)}`)

            // keep only the last 5 elements, so if the last intention added is not valid,
            // there is immediatly a new one to use
            while (this.intention_queue.length > 0) {
                var int = this.intention_queue.pop()
                int.stop()
            }

            this.intention_queue.unshift(new Intention(this, predicate))
            logger.warn(`Intentions: ${JSON.stringify(this.intention_queue.map((x) => x.predicate))}`)
        }catch(error){
            logger.error(error)
        }
    }
}

export const myAgent = new Agent()
myAgent.loop()
