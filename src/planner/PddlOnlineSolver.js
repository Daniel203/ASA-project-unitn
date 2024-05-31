import fetch from "node-fetch"
import { sleep } from "../utils.js"

const BASE_URL = "https://solver.planning.domains:5001"
// const BASE_URL = "http://localhost:5001"
const FETCH_URL = BASE_URL + "/package/lama-first/solve"

/**
 * Validate inputs to ensure they are strings.
 * @param {String} pddlDomain
 * @param {String} pddlProblem
 * @throws Will throw an error if inputs are not strings.
 */
function validateInputs(pddlDomain, pddlProblem) {
    if (typeof pddlDomain !== "string" && !(pddlDomain instanceof String)) {
        throw new Error("pddlDomain is not a string")
    }
    if (typeof pddlProblem !== "string" && !(pddlProblem instanceof String)) {
        throw new Error("pddlProblem is not a string")
    }
}

/**
 * Get the URL to fetch the plan
 * @param {String} pddlDomain
 * @param {String} pddlProblem
 * @returns {Promise<Object>}
 * @throws Will throw an error if the fetch fails.
 */
async function getPlanFetchUrl(pddlDomain, pddlProblem) {
    try {
        const response = await fetch(FETCH_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ domain: pddlDomain, problem: pddlProblem }),
        })

        if (!response.ok) {
            throw new Error(`Error at ${FETCH_URL}: ${response.statusText}`)
        }

        const result = await response.json()

        if (result.status === "error") {
            const errorMessage = result.result.error || "Unknown error"
            throw new Error(`Error at ${FETCH_URL}: ${errorMessage}`)
        }

        return result.result
    } catch (error) {
        console.error(`Failed to fetch initial plan: ${error.message}`)
        throw error
    }
}

/**
 * Fetch the plan until it's ready or times out.
 * @param {String} fetchPlanUrl
 * @returns {Promise<Object>}
 * @throws Will throw an error if the fetch fails or times out.
 */
async function fetchPlan(fetchPlanUrl) {
    let attempts = 0
    let response

    try {
        do {
            const fetchResponse = await fetch(fetchPlanUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ adaptor: "planning_editor_adaptor" }),
            })

            if (!fetchResponse.ok) {
                throw new Error(`Error at ${fetchPlanUrl}: ${fetchResponse.statusText}`)
            }

            console.log(fetchResponse)
            response = await fetchResponse.json()

            if (response.status === "error") {
                const errorMessage = response.error || "Unknown error"
                throw new Error(`Error at ${fetchPlanUrl}: ${errorMessage}`)
            }

            await sleep(500)
            attempts++
        } while (response.status === "PENDING" && attempts < 10)

        if (attempts === 10) {
            throw new Error("Timeout while waiting for the detailed plan")
        }

        console.log(response)
        return response.plans[0]
    } catch (error) {
        console.error(`Failed to fetch detailed plan: ${error.message}`)
        throw error
    }
}

/**
 * Process the plan result into pddlPlanStep array.
 * @param {Object} planResult
 * @returns {PddlPlanStep[]}
 */
function processPlan(planResult) {
    /** @type {PddlPlanStep[]} */
    const plan = []

    if (planResult.result.plan) {
        /** @type {Array<{name: string, action: string}>} */
        const plans = planResult.result.plan

        for (let step of plans) {
            let line = step.name || step
            line = line.replace("(", "").replace(")", "").split(" ")

            const action = line.shift()
            const args = line

            plan.push({ parallel: false, action: action, args: args })
        }
    }

    return plan
}

/**
 * @param {String} pddlDomain
 * @param {String} pddlProblem
 * @returns {Promise<PddlPlanStep[]>}
 */
export default async function onlineSolver(pddlDomain, pddlProblem) {
    try {
        validateInputs(pddlDomain, pddlProblem)

        const fetchPlanUrlRes = await getPlanFetchUrl(pddlDomain, pddlProblem)
        if (!fetchPlanUrlRes) return []

        const fetchPlanUrl = BASE_URL + fetchPlanUrlRes
        const detailedPlan = await fetchPlan(fetchPlanUrl)

        if (!detailedPlan) return []

        return processPlan(detailedPlan)
    } catch (error) {
        console.error(`Error in onlineSolver: ${error.message}`)
        return []
    }
}
