// import Beliefset from "./Beliefset.js"
// import PddlProblem from "./PddlProblem.js"
// import PddlAction from "./PddlAction.js"
// import PddlDomain from "./PddlDomain.js"
// import PddlExecutor from "./PddlExecutor.js"
import onlineSolver from "./PddlOnlineSolver.js"
import { readFile } from "../utils.js"
import path from "path"
import {fileURLToPath} from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Get the plan given a problem inside the deliveroo domain
 * @param {String} problem - The problem in pddl format
 * @returns {Promise<PddlPlanStep[]>} The list of steps to execute in order to achieve the plan
 */
export async function getPlan(problem) {
    let domainPath = path.join(__dirname, "domain.pddl")
    let domain = await readFile(domainPath)
    var plan = await onlineSolver(domain, problem)

    return plan
}

getPlan("")