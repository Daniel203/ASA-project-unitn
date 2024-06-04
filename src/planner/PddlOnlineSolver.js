import fetch from "node-fetch"
import { sleep } from "../utils.js"
import { logger } from "../logger.js"
import config from "../../config.js"

const BASE_URL = config.pddlSolverURL
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
            body: JSON.stringify({ domain: pddlDomain, problem: pddlProblem, number_of_plans: 1 }),
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
        logger.error(`Failed to fetch initial plan: ${error.message}`)
        throw error
    }
}

/**
 * Fetch the plan until it's ready or times out.
 * @param {String} fetchPlanUrl
 * @param {number} maxAttempts - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay in milliseconds for exponential backoff
 * @returns {Promise<Object>}
 * @throws Will throw an error if the fetch fails or times out.
 */
async function fetchPlan(fetchPlanUrl, maxAttempts = 10, baseDelay = 100) {
    let attempts = 0
    let response

    const fetchWithRetry = async () => {
        const fetchResponse = await fetch(fetchPlanUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            // body: JSON.stringify({ adaptor: "planning_editor_adaptor" }),
        })

        if (!fetchResponse.ok) {
            throw new Error(`Error at ${fetchPlanUrl}: ${fetchResponse.statusText}`)
        }

        response = await fetchResponse.json()

        if (response.status === "error") {
            const errorMessage = response.result.error || "Unknown error"
            throw new Error(`Error at ${fetchPlanUrl}: ${errorMessage}`)
        }

        return response
    }

    while (attempts < maxAttempts) {
        attempts++
        await sleep(baseDelay)

        try {
            response = await fetchWithRetry()

            if (response.status !== "PENDING") {
                return response.result.output.sas_plan
            }
        } catch (error) {
            logger.error(`Attempt ${attempts} failed: ${error.message}`)
            if (attempts === maxAttempts) {
                throw new Error("Timeout while waiting for the detailed plan")
            }
        }
    }

    throw new Error("Failed to fetch detailed plan after maximum attempts")
}

/**
 * Process the plan result into pddlPlanStep array.
 * @param {Object} planResult
 * @returns {PddlPlanStep[]}
 */
function processPlan(planResult) {
    var lines = planResult.split("\n")
    lines = lines.map((line) => line.replace("(", "").replace(")", "").split(" "))
    lines.pop()
    lines.pop()

    /** @type {PddlPlanStep[]} */
    var plan = []

    for (let /**@type {string}*/ line of lines) {
        var action = line.shift()
        var args = line

        plan.push({ parallel: false, action: action, args: args })
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
        logger.error(`Error in onlineSolver: ${error.message}`)
        return []
    }
}
