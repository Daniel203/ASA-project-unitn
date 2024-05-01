import { Heap } from "heap-js"
import { distance } from "./utils.js"
import "./types.js"

/**
 * Heuristic function that estimates the cost to reach goal from node n
 * @param {Point} point
 * @param {Point} goal
 * @returns {number} score of the euristc function
 */
function h(point, goal) {
    let x = point.x
    let y = point.y
    return distance(goal, { x, y })
}

/**
 * @param {Map<Point, Point>} cameFrom
 * @param {Point} current
 * @returns {Array<Point>} total_path
 */
function reconstructPath(cameFrom, current) {
    const totalPath = [current]
    while (cameFrom.has(current)) {
        current = cameFrom.get(current)
        totalPath.unshift(current)
    }
    return totalPath
}

/**
 * @param {Point} point
 * @param {Array<Array<number>>} grid
 * @param {number} height
 * @param {number} width
 * @returns {Array<Point>} neighbors
 */
function getNeighbors(point, grid, height, width) {
    const neighbors = []

    // TODO: it only checks if the block is walkable, but it should also check there is no other robot
    if (point.x > 0 && grid[point.x - 1][point.y] !== 0) {
        neighbors.push({ x: point.x - 1, y: point.y })
    }
    if (point.x < width - 1 && grid[point.x + 1][point.y] !== 0) {
        neighbors.push({ x: point.x + 1, y: point.y })
    }
    if (point.y > 0 && grid[point.x][point.y - 1] !== 0) {
        neighbors.push({ x: point.x, y: point.y - 1 })
    }
    if (point.y < height - 1 && grid[point.x][point.y + 1] !== 0) {
        neighbors.push({ x: point.x, y: point.y + 1 })
    }

    return neighbors
}

/**
 * @param {Point} start
 * @param {Point} goal
 * @param {Array<Array<number>>} grid
 * @returns {Array<Point>} path
 */
function astar(start, goal, grid) {
    const width = grid.length
    const height = grid[0].length

    // The set of nodes already evaluated
    var openSet = new Heap()
    openSet.init([start])

    var cameFrom = new Map()

    // For node n, gScore[n] is the cost of the cheapest path from start to n currently known.
    var gScore = new Map()
    gScore.set(start, 0)

    // For node n, fScore[n] := gScore[n] + h(n)
    // fScore[n] represents our current best guess as to how short a path from start to finish can be if it goes through n.
    var fScore = new Map()
    fScore.set(start, h(start, goal))

    while (openSet.size() > 0) {
        var current = openSet.pop()

        if (current === goal) {
            return reconstructPath(cameFrom, current)
        }

        for (let neighbor of getNeighbors(current, grid, height, width)) {
            // In our case the distance between two nodes is always 1
            var tentativeGScore = gScore.get(current) + 1

            if (!gScore.has(neighbor) || tentativeGScore < gScore.get(neighbor)) {
                cameFrom.set(neighbor, current)
                gScore.set(neighbor, tentativeGScore)
                fScore.set(neighbor, gScore.get(neighbor) + h(neighbor, goal))

                if (!openSet.contains(neighbor)) {
                    openSet.add(neighbor)
                }
            }
        }
    }

    return []
}

export { astar }
