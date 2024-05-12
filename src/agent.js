import { parcels, me } from "./run.js"
import { logger } from "./logger.js"
import { Intention } from "./intention.js"

class Agent {
    /** @type {Array<Intention>} */
    #intention_queue = new Array()

    get intention_queue() {
        return this.#intention_queue
    }

    /** @type {Intention} */
    #current_intention = null

    get current_intention() {
        return this.#current_intention
    }

    async loop() {
        for (; ;) {
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
                intention.achieve()
                    .catch((error) => {
                        logger.warn(
                            `Failed to achieve intention ${JSON.stringify(intention.predicate)}: ${JSON.stringify(error)}`,
                        )
                    })
                    .finally(() => {
                        this.intention_queue.shift()
                        this.#current_intention = null
                    })


            }

            // Postpone next iteration at setImmediate
            await new Promise((res) => setImmediate(res))
        }
    }

    log(...args) {
        logger.info(...args)
    }

    async push(predicate) {
        logger.info(`intention queue before: ${JSON.stringify(this.intention_queue.map((x) => x.predicate))}`)
        logger.info(`last intention: ${JSON.stringify(this.current_intention?.predicate)}`)

        if (this.intention_queue.find((i) => i.predicate.id == predicate.id)) {
            logger.warn(`Intention already in queue: ${JSON.stringify(predicate)}`)
            return
        }

        logger.info(`Intention not in queue: ${JSON.stringify(predicate)}`)

        // if (this.current_intention != null) {
        //     var currentAction = "" 
        //     
        //     if (this.current_intention != null) {
        //         currentAction = this.current_intention.predicate.action
        //     }
        //
        //     const action = predicate.action
        //
        //     if (currentAction == "go_random") {
        //         if (action == "go_random") {
        //             return 
        //         } else {
        //             this.current_intention.stop()
        //         }
        //     }
        // }

        while (this.intention_queue.length > 0) {
            const curr = this.intention_queue.pop()
        }

        this.intention_queue.push(new Intention(this, predicate))
        logger.warn(`Intentions: ${JSON.stringify(this.intention_queue.map((x) => x.predicate))}`)
    }
}

export const myAgent = new Agent()
myAgent.loop()
