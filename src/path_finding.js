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

    try {
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
    } catch (e) {
        console.error(e)
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

    /** @type {Map<Point, Point>} */
    var cameFrom = new Map()

    /**
     * Represent the score of the cheapest path from start to n currently known.
     * @type {Map<Point, number>}
     */
    var gScore = new Map()
    gScore.set(start, 0)

    /**
     * Represents our current best guess as to how short a path from start to finish can be if it goes through n.
     * @type {Map<Point, number>}
     */
    var fScore = new Map()
    fScore.set(start, h(start, goal))

    const customPriorityComparator = (a, b) => {
        fScore.get(a) < fScore.get(b)
    }

    /** @type {Heap<Point>} */
    var openSet = new Heap(customPriorityComparator)
    openSet.init([start])

    while (openSet.size() > 0 && openSet.size() < height * width) {
        var current = openSet.pop()

        if (current.x == goal.x && current.y == goal.y) {
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
