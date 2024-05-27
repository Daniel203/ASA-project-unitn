#!/usr/bin/env node

import { spawn } from "child_process"

const vcarb_1 = {
    id: "e083aa6f59e",
    name: "VCARB1",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI1Mjg3MjU2MjEzIiwibmFtZSI6IlZDQVJCMSIsImlhdCI6MTcxNjgxODQyMH0.ZPtFcrJ-9fejEi4afzBUL1jmx_8oUDoarLirbEaMQsI",
}

const vcarb_2 = {
    id: "1d74b61b883",
    name: "VCARB2",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI4NzI1NjIxMzJkIiwibmFtZSI6IlZDQVJCMiIsImlhdCI6MTcxNjgxOTk1OX0.Xg-_iH2ndj2EVl55t8P9JpsL1ev4F0yJlGVdZm3J4aM",
}

spawnProcesses(vcarb_1, vcarb_2)
spawnProcesses(vcarb_2, vcarb_1)

function spawnProcesses(me, teamMate) {
    const childProcess = spawn(
        `node src/run.js \
        host="http://localhost:8080" \
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
