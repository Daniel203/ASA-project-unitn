import { client } from "./run.js"

// Sleep function
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

const map = []

client.onMap((width, height, tiles) => {
    if (map.length == 0) {
        for (let i = 0; i < width; i++) {
            const col = []
            for (let j = 0; j < height; j++) {
                col.push(1)
            }
            map.push(col)
        }
    }
})

//Find delivery
const deliveries = []
client.onTile(async (x, y, delivery, parcel) => {
    if (map.length == 0) await sleep(1000)

    if (delivery) {
        console.log(x + " " + y)
        deliveries.push({ x: x, y: y })
        map[x][y] = 2
    }
})

//Find NoZone
const noZone = []
client.onNotTile(async (x, y) => {
    if (map.length == 0) await sleep(1000)

    noZone.push({ x: x, y: y })
    map[x][y] = 0
})

await sleep(3000)
console.log("Map:\n")
map.forEach((row) => {
    row.forEach((element) => {
        process.stdout.write(element + " ")
    })
    console.log("\n")
})
