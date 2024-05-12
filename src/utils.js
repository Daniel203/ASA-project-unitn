import "./types.js"
import { speedParcel, speed, maxParcels } from "./run.js"

/**
 * @param {Point} point1
 * @param {Point} point2
 * @returns {number} distance between two points
 */
export function distance(point1, point2) {
    const dx = Math.abs(Math.round(point1.x) - Math.round(point2.x))
    const dy = Math.abs(Math.round(point1.y) - Math.round(point2.y))
    return dx + dy
}

/**
 * @param {Number} ms
 * @returns {Promise<void>} sleep for ms milliseconds
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @param {Array<Point>} path
 * @returns {Array<string>} the directions to follow in order to follow the path
 */
export function getDirections(path) {
    const directions = []
    let x = path[0].x
    let y = path[0].y

    path.forEach((coord) => {
        if (x == coord.x - 1) {
            directions.push("right")
            x += 1
        } else if (x == coord.x + 1) {
            directions.push("left")
            x -= 1
        } else if (y == coord.y - 1) {
            directions.push("up")
            y += 1
        } else if (y == coord.y + 1) {
            directions.push("down")
            y -= 1
        }
    })

    return directions
}

/**
 * @param {Parcel} parcel
 * @param {number} distance
 * @param {Map<string, Rival>} rivals
 * @returns {number} the score given to the option
 */
export function getOptionScore(parcel, dist, rivals) {
    const distanceWeight = 4
    const valueWeight = 3
    const rivalsWeight = 3

    let score = 0
    if (speedParcel == 0) {
        score = 1000 - dist
    } else {
        if (rivals.size > 0) {
            const nearestRival = [...rivals.values()].sort(
                (a, b) => distance(parcel, a) - distance(parcel, b),
            )[0]
            score = distance(parcel, nearestRival)
        }

        score = -dist * distanceWeight + parcel.value * valueWeight + score * rivalsWeight
    }

    return score
}

/**
 * @param {Point} point - the starting point
 * @param {Array<Delivery>}  deliveries
 * @returns {number} the best distance between delivery and parcel
 */
export function getNearestDelivery(point, deliveries) {
    let nearest = Number.MAX_VALUE

    deliveries.forEach((delivery) => {
        let currentDistance = distance(point, delivery)
        if (currentDistance < nearest) {
            nearest = currentDistance
        }
    })

    return nearest
}

export async function getExecutionTime(f, ...args) {
    var start = new Date().getTime();
    await f(...args)
    var end = new Date().getTime();
    var dur = end - start;
    return dur
  }
