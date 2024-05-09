import { parcels, me } from "./run.js"
import { logger } from "./logger.js"
import { Intention } from "./intention.js"

class Agent {
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
                    logger.warn(
                        `Failed to achieve intention ${JSON.stringify(intention.predicate)}: ${JSON.stringify(error)}`,
                    )
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

    async push(predicate) {
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

        this.intention_queue.push(new Intention(this, predicate))
        logger.info(
            `intention queue ${JSON.stringify(this.intention_queue.map((x) => x.predicate))}`,
        )
    }
}

export const myAgent = new Agent()
myAgent.loop()
