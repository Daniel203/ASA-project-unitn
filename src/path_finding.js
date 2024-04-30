import { client } from "./run.js"

function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const dx = Math.abs(Math.round(x1) - Math.round(x2))
    const dy = Math.abs(Math.round(y1) - Math.round(y2))
    return dx + dy
}

function reconstruct_path(cameFrom, current) {
    const total_path = [current]
    while (cameFrom.has(current)) {
        current = cameFrom.get(current)
        total_path = [current].concat(total_path) // prepend
        console.log(total_path)
    }
    return total_path
}

function a_star(start, goal, h) {
    // The set of discovered nodes that may need to be (re-)expanded.
    // Initially, only the start node is known.
    // This is usually implemented as a min-heap or priority queue rather than a hash-set.
    const openSet = [start]

    // For node n, cameFrom[n] is the node immediately preceding it on the cheapest path from the start
    // to n currently known.
    const cameFrom = new Map()

    // For node n, gScore[n] is the cost of the cheapest path from start to n currently known.
    const gScore = new Map() // default value of Infinity
    gScore[start] = 0

    // For node n, fScore[n] := gScore[n] + h(n). fScore[n] represents our current best guess as to
    // how cheap a path could be from start to finish if it goes through n.
    const fScore = new Map() // default value of Infinity
    fScore[start] = 0 + h(start)
    console.log(openSet)
    while (openSet.length > 1)
        // openSet is not empty
        // This operation can occur in O(Log(N)) time if openSet is a min-heap or a priority queue
        openSet.sort((a, b) => h(a) - h(b))
    //let current = openSet[0] // the node in openSet having the lowest fScore[] value
    let current = openSet.shift()
    console.log(openSet)
    if (h(current) == 0) return reconstruct_path(cameFrom, current)
    console.log("VAMOS VCARB")
    let neighbors = new Array(
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
    )
    //neighbors = neighbors.filter((e) => map[neighbor.x][neighbor.y])
    console.log(neighbors)
    for (const neighbor of neighbors) {
        // each neighbor of current
        // d(current,neighbor) is the weight of the edge from current to neighbor
        // tentative_gScore is the distance from start to the neighbor through current
        let tentative_gScore = gScore[current] + 1
        if (tentative_gScore < (gScore[neighbor] || Number.MAX_VALUE)) {
            // This path to neighbor is better than any previous one. Record it!
            cameFrom.set(neighbor, current)
            gScore.set(neighbor, tentative_gScore)
            fScore.set(neighbor, tentative_gScore + h(neighbor))
            if (!openSet.includes(neighbor))
                // neighbor not in openSet
                openSet.push(neighbor)
        }
    }

    // Open set is empty but goal was never reached
    return []
}

const start = { x: 4, y: 12 }
const goal = { x: 10, y: 10 }

function h(e) {
    let x = e.x
    let y = e.y
    const dis = distance(goal, { x, y })
    console.log(dis)
    return dis
}

const path = a_star(start, goal, h)

for (let i = 0; i < path.length; i++) {
    const element = path[i]
    console.log(i + " move " + " " + element.x + "," + element.y)
}
