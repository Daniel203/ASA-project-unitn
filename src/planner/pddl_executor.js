import "../types.js"
import { client } from "../run.js"

export default class PddlExecutor {
    /**
     * @param {PddlPlanStep[]} plan
     */
    constructor(plan) {
        this.plan = plan
    }

    getIntentionsList() {
        /** @type {Option[]} */
        const intentions = []
        // console.log("getIntentionsList this.plan")
        // console.log(this.plan)

        for (const planStep of this.plan) {
            if (planStep.action === "move") {
                // const {x: xFrom, y: yFrom} = this.getCoordinatesFromString(planStep.args[1])
                const { x: xTo, y: yTo } = this.getCoordinatesFromString(planStep.args[2])
                intentions.push({ action: "go_to", x: xTo, y: yTo })
            } else if (planStep.action === "pickup") {
                intentions.push({ action: "pick_up" })
            } else if (planStep.action === "deliver") {
                intentions.push({ action: "put_down" })
            }
        }

        return intentions
    }

    getCoordinatesFromString(str) {
        const args = str.split("_")
        const y = parseInt(args[0].replace("y", ""))
        const x = parseInt(args[1].replace("x", ""))
        return { x, y }
    }
}
