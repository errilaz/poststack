/** 
 * Creates a strongly typed CLI parser function.
 ** Only parses. Does not coerce, validate, or throw.
 ** Reports unrecognized options.
*/
function options<OptionsDefinition extends OptionsDefinitionBase>(definition: OptionsDefinition) {
  // TODO: level max
  let rawOption: null | string = null
  let argsOption: null | string = null
  const args: string[] = []
  const lookupAlias: { [alias: string]: string | undefined } = {}
  const defaultConfig = {} as any
  for (const name in definition) {
    const option = definition[name]
    defaultConfig[name] = cloneValue(option.defaultValue)
    if (option.type === "raw") {
      rawOption = name
    }
    else if (option.type === "args") {
      argsOption = name
    }
    else if (option.type === "arg") {
      args[option.index] = name
    }
    else if (option.alias) {
      lookupAlias[option.alias] = name
    }
  }
  parse.generateHelp = generateHelp
  return parse

  function parse(argv: string[]) {
    const config = cloneRecord(defaultConfig)
    config.unrecognized = {
      named: [],
      positional: []
    }
    let remainingArgs = args.slice()
    for (let a = 0; a < argv.length; a++) {
      const arg = argv[a]
      if (arg === "--") {
        if (rawOption === null) continue
        config[rawOption] = argv.slice(a + 1)
        break
      }
      else if (arg.startsWith("--") || (arg[0] === "-" && arg.length === 2)) {
        const alias = arg[1]
        const isAlias = alias !== "-"
        if (isAlias && !lookupAlias[alias]) {
          config.unrecognized.named.push(alias)
          continue
        }
        const name = isAlias ? lookupAlias[alias]! : dashedToCamel(arg.substring(2))
        const option = definition[name]
        if (!option) {
          config.unrecognized.named.push(name)
          continue
        }
        if (option.type === "bit") {
          config[name] = true
          continue
        }
        const hasNext = argv[a + 1] && argv[a + 1][0] !== "-"
        if (option.type === "flag") {
          if (hasNext) {
            config[name] = argv[++a];
          }
          continue
        }
        if (option.type === "list") {
          if (hasNext) {
            config[name].push(argv[++a]);
          }
          continue
        }
        if (option.type === "level") {
          config[name]++
          continue
        }
      }
      else if (arg.startsWith("-") && arg.length > 2) {
        const letters = arg.substring(1).split("");
        for (const letter of letters) {
          const name = lookupAlias[letter]
          if (!name) {
            config.unrecognized.named.push(letter)
            continue
          }
          const option = definition[name]
          if (!option) {
            config.unrecognized.named.push(name)
            continue
          }
          if (option.type === "bit") {
            config[name] = true;
          }
          else if (option.type === "level") {
            config[name]++;
          }
        }
      }
      else {
        if (remainingArgs.length > 0) {
          const [name] = remainingArgs.splice(0, 1)
          config[name] = arg
          continue
        }
        else if (argsOption !== null) {
          config[argsOption].push(arg)
        }
        else {
          config.unrecognized.positional.push(arg)
        }
      }
    }
    return config as unknown as Options<OptionsDefinition>
  }

  function generateHelp(prefix: string) {
    return "Usage: " + prefix + " " + JSON.stringify(definition, null, 2)
  }
}

export type OptionsDefinitionBase = {
  [name: string]: Option
}

export type Options<OptionsDefinition extends OptionsDefinitionBase> = {
  [O in keyof OptionsDefinition]: OptionsDefinition[O]["defaultValue"]
} & {
  unrecognized: {
    named: string[]
    positional: string[]
  }
}

export type Help = string | ([string] | [string, string])[]

module options {
  /** Positional string argument. */
  export function arg(index: number, help?: Help): ArgOption {
    return { type: "arg", index, help, defaultValue: null }
  }

  /** All position string arguments. */
  export function args(help?: Help): ArgsOption {
    return { type: "args", help, defaultValue: [] }
  }

  /** Named boolean option, no parameters. */
  export function bit(alias?: string, help?: Help): BitOption {
    return { type: "bit", alias, help, defaultValue: false }
  }

  /** Named string option. */
  export function flag(alias?: string, help?: Help, defaultValue?: string): FlagOption {
    return { type: "flag", alias, help, defaultValue: defaultValue === undefined ? null : defaultValue }
  }

  /** Named list option */
  export function list(alias?: string, help?: Help): ListOption {
    return { type: "list", alias, help, defaultValue: [] }
  }

  /** Repeatable named number level. */
  export function level(alias?: string, help?: Help): LevelOption {
    return { type: "level", alias, help, defaultValue: 0 }
  }

  /** Everything after the --. */
  export function raw(help?: Help): RawOption {
    return { type: "raw", help, defaultValue: null }
  }
}

export default options

export type Option =
  | ArgOption
  | ArgsOption
  | BitOption
  | FlagOption
  | ListOption
  | LevelOption
  | RawOption

export interface ArgOption {
  type: "arg"
  index: number
  help?: Help
  defaultValue: string | null
}

export interface ArgsOption {
  type: "args"
  help?: Help
  defaultValue: string[]
}

export interface BitOption {
  type: "bit"
  alias?: string
  help?: Help
  defaultValue: boolean
}

export interface FlagOption {
  type: "flag"
  alias?: string
  help?: Help
  defaultValue: string | null
}

export interface ListOption {
  type: "list"
  alias?: string
  help?: Help
  defaultValue: string[]
}

export interface LevelOption {
  type: "level"
  alias?: string
  help?: Help
  defaultValue: number
}

export interface RawOption {
  type: "raw"
  help?: Help
  defaultValue: string | null
}

/** Converts dashed-case to camelCase. */
function dashedToCamel(dashed: string) {
  return dashed.replace(/-[a-z]/g, ([, c]) => c.toUpperCase())
}

/** Clone simple values and arrays. */
function cloneValue(x: any) {
  if (Array.isArray(x)) return x.slice()
  return x
}

/** Clone a record one-deep. */
function cloneRecord(record: any): any {
  const clone = {} as any
  for (const key in record) {
    clone[key] = cloneValue(record[key])
  }
  return clone
}