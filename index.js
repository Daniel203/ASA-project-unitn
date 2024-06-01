#!/usr/bin/env node

import { spawn } from "child_process"

export const vcarb_1 = {
    id: "62a5ecddb43",
    name: "VCARB_1",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyYTVlY2RkYjQzIiwibmFtZSI6IlZDQVJCXzEiLCJpYXQiOjE3MTcyMzUzNjB9.QiFgHrVT00z6inSpkbR_AKbKf7Rlx-iRHmgc0r22sTg",
}

export const vcarb_2 = {
    id: "2a5ecddb436",
    name: "VCARB_2",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJhNWVjZGRiNDM2IiwibmFtZSI6IlZDQVJCXzIiLCJpYXQiOjE3MTcyMzUzOTF9.3_0rlHo5gxZ0485dICw5kHJKbUumwL9D_Lbfuj1jtqY",
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
