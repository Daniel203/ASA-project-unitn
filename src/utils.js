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
