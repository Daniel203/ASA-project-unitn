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
    console.log("###########RecostructPath###############")
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
    var x = point.x
    var y = point.y

    try {
        if (x > 0 && grid[x - 1][y] !== 0) {
            neighbors.push({ x: x - 1, y: y })
        }
        if (x < width - 1 && grid[x + 1][y] !== 0) {
            neighbors.push({ x: x + 1, y: y })
        }
        if (y > 0 && grid[x][y - 1] !== 0) {
            neighbors.push({ x: x, y: y - 1 })
        }
        if (y < height - 1 && grid[x][y + 1] !== 0) {
            neighbors.push({ x: x, y: y + 1 })
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
    // check if the start and goal are integer and not float
    if (start.x % 1 !== 0 || start.y % 1 !== 0) {
        return []
    }

    if (goal.x % 1 !== 0 || goal.y % 1 !== 0) {
        return []
    }

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
        return fScore.get(a) - fScore.get(b)
    }

    /** @type {Heap<Point>} */
    var openHeap = new Heap(customPriorityComparator)
    openHeap.init([start])

    // check that the size is less than height * width to avoid infinite loop
    while (openHeap.size() > 0 && openHeap.size() < height * width) {
        var current = openHeap.pop()

        if (current.x == goal.x && current.y == goal.y) {
            return reconstructPath(cameFrom, current)
        }

        const neighbors = getNeighbors(current, grid, height, width)
        for (let neighbor of neighbors) {
            // In our case the distance between two nodes is always 1
            var tentativeGScore = gScore.get(current) + 1

            if (!gScore.has(neighbor) || tentativeGScore < gScore.get(neighbor)) {
                cameFrom.set(neighbor, current)
                gScore.set(neighbor, tentativeGScore)
                fScore.set(neighbor, gScore.get(neighbor) + h(neighbor, goal))

                if (!openHeap.contains(neighbor)) {
                    openHeap.add(neighbor)
                }
            }
        }
    }

    return []
}

export { astar }
