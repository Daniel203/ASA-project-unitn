// import Beliefset from "./Beliefset.js"
// import PddlProblem from "./PddlProblem.js"
// import PddlAction from "./PddlAction.js"
// import PddlDomain from "./PddlDomain.js"
// import PddlExecutor from "./PddlExecutor.js"
import onlineSolver from "./PddlOnlineSolver.js"
import { readFile } from "../utils.js"

/**
 * Get the plan given a problem inside the deliveroo domain
 * @param {String} problem - The problem in pddl format
 * @returns {Promise<PddlPlanStep[]>} The list of steps to execute in order to achieve the plan
 */
export async function get_plan(problem) {
    let domain = await readFile("./domain.pddl")

    var plan = await onlineSolver(domain, problem)

    return plan
}
