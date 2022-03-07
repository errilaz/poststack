#!/usr/bin/env node
import pg from "pg-promise"
import options from "@poststack/options"
import inspect, { UdtOptions } from "@poststack/db-inspector"
import generate from "@poststack/ts-generator"
import { promises as FS } from "node:fs"
import { constants as FS_CONSTANTS } from "node:fs"
import Path from "node:path"

const DB_HOST = process.env.DB_HOST || "localhost"
const DB_PORT = process.env.DB_PORT || "5432"
const DB_NAME = process.env.DB_NAME || "postgres"
const DB_USER = process.env.DB_USER || "postgres"
const DB_PASS = process.env.DB_PASS || "postgres"

const parse = options({
  command: options.arg(0, [
    ["inspect", "print human schema information"],
    ["inspect-json", "print schema in JSON"],
    ["inspect-ts", "print schema in TypeScript"],
    ["build", "inspect and build TypeScript output"],
  ]),
  file: options.flag("f", "path to project file (.poststack.json)"),
  output: options.flag("o", "send results to file"),
  host: options.flag("h", "database hostname", DB_HOST),
  port: options.flag("p", "database port", DB_PORT),
  dbname: options.flag("d", "database name", DB_NAME),
  user: options.flag("U", "database user name", DB_USER),
  help: options.bit("Display this message"),
})

const { command, help, host, port, dbname, user, file, output } = parse(process.argv.slice(2))

if (help || command === "help" || command === null) {
  console.log(parse.generateHelp("poststack"))
  process.exit(0)
}

cli()
  .then(() => process.exit())
  .catch(e => { console.error(e); process.exit(1) })

async function cli() {
  switch (command) {
    case "inspect": {
      const database = await connect(true)
      await inspect(database, { verbose: true })
      break
    }
    case "inspect-json": {
      const database = await connect()
      const schema = await inspect(database)
      console.log(JSON.stringify(schema, null, 2))
      break
    }
    case "inspect-ts": {
      const database = await connect()
      const schema = await inspect(database)
      const ts = generate(schema)
      console.log(ts)
      break
    }
    case "build": {
      let project: Project = {}
      if (file) {
        project = JSON.parse(await FS.readFile(file, "utf8")) as Project
      }
      else {
        project = await findProject() || {}
      }
      const path = output || project.output || null
      if (path === null) {
        console.error("No output file specified")
        process.exit(1)
        break
      }
      const database = await connect(true)
      const schema = await inspect(database, { verbose: true, udts: project.udts })
      const ts = generate(schema)
      await FS.writeFile(path, ts, "utf8")
      break
    }
    default: {
      console.log(`Unknown command: ${command}`)
      console.log(parse.generateHelp("poststack"))
      process.exit()
    }
  }
}

type Database = pg.IConnected<{}, any>;

interface Project {
  output?: string
  udts?: UdtOptions
}

async function connect(verbose = false): Promise<Database> {
  if (verbose) console.log("connecting")
  const conn = pg()({
    host: host!,
    port: parseInt(port!, 10),
    user: user!,
    password: DB_PASS,
    database: dbname!
  })
  const instance = await conn.connect()
  return instance
}

async function findProject(): Promise<Project | null> {
  let dir = process.cwd()
  while (true) {
    const project = Path.join(dir, ".poststack.json")
    if (await exists(project)) {
      const text = await FS.readFile(project, "utf8")
      return JSON.parse(text) as Project
    }
    if (dir === "/") break
    dir = Path.dirname(dir)
  }
  return null
}

async function exists(file: string) {
  try {
    await FS.access(file, FS_CONSTANTS.F_OK)
    return true
  }
  catch { return false }
}