#!/usr/bin/env node

import { spawn } from "child_process"
import config from "./config.js"

const vcarb_1 = config.vcarb_1
const vcarb_2 = config.vcarb_2

spawnProcesses(vcarb_1, vcarb_2)
spawnProcesses(vcarb_2, vcarb_1)

function spawnProcesses(me, teamMate) {
    const childProcess = spawn(
        `node src/run.js \
        host="${config.host}" \
        token="${me.token}" \
        teamId="${teamMate.id}" `,
        { shell: true },
    )

    childProcess.stdout.on("data", (data) => {
        console.log(me.name, ">", data.toString())
    })

    childProcess.stderr.on("data", (data) => {
        console.error(me.name, ">", data.toString())
    })

    childProcess.on("close", (code) => {
        console.log(`${me.name}: exited with code ${code}`)
    })
}
