import "./types.js"

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

export function getScoreOption(parcel, dist, val, rivals) {
    const scoreDistance = 0.4
    const scoreValue = 0.3
    const scoreRivals = 0.3
    let score = 0
    rivals.forEach((rival) => {
        let d = distance({ x: parcel.x, y: parcel.y }, { x: rival.x, y: rival.y })
        score += d
    })
    score = score * scoreRivals + dist * scoreDistance + val * scoreValue
    return score
}
