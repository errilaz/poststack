function options<OptionsDefinition extends OptionsDefinitionBase>(definition: OptionsDefinition) {
  let rawOption: null | string = null
  let argsOption: null | string = null
  let args: string[] = []
  let aliases: { [alias: string]: string | undefined } = {}
  const defaultConfig = {} as any
  for (const name in definition) {
    const option = definition[name]
    defaultConfig[name] = clone(option.actualType)
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
      aliases[option.alias] = name
    }
  }
  return (argv: string[]) => {
    const config = { ...defaultConfig, unrecognized: [] }
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
        if (isAlias && !aliases[alias]) {
          config.unrecognized.push(alias)
          continue
        }
        const name = isAlias ? aliases[alias]! : kebabToCamel(arg.substring(2))
        const option = definition[name]
        if (!option) {
          config.unrecognized.push(name)
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
          const name = aliases[letter]
          if (!name) {
            config.unrecognized.push(letter)
            continue
          }
          const option = definition[name]
          if (!option) {
            config.unrecognized.push(name)
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
      }
    }
    return config as unknown as Options<OptionsDefinition>
  }
}

export type OptionsDefinitionBase = {
  [name: string]: Option
}

export type Options<OptionsDefinition extends OptionsDefinitionBase> = {
  [O in keyof OptionsDefinition]: OptionsDefinition[O]["actualType"]
} & {
  unrecognized: string[]
}

module options {
  /** Positional string argument. */
  export function arg(index: number): ArgOption {
    return { type: "arg", index, actualType: null }
  }

  /** All position string arguments. */
  export function args(): ArgsOption {
    return { type: "args", actualType: [] }
  }

  /** Parameterless boolean option. */
  export function bit(alias?: string): BitOption {
    return { type: "bit", alias, actualType: false }
  }

  /** Named string option. */
  export function flag(alias?: string): FlagOption {
    return { type: "flag", alias, actualType: null }
  }

  /** Named list option */
  export function list(alias?: string): ListOption {
    return { type: "list", alias, actualType: [] }
  }

  /** Repeatable named number level. */
  export function level(alias?: string): LevelOption {
    return { type: "level", alias, actualType: 0 }
  }

  /** Everything after the --. */
  export function raw(): RawOption {
    return { type: "raw", actualType: null }
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
  actualType: string | null
}

export interface ArgsOption {
  type: "args"
  actualType: string[]
}

export interface BitOption {
  type: "bit"
  alias?: string
  actualType: boolean
}

export interface FlagOption {
  type: "flag"
  alias?: string
  actualType: string | null
}

export interface ListOption {
  type: "list"
  alias?: string
  actualType: string[]
}

export interface LevelOption {
  type: "level"
  alias?: string
  actualType: number
}

export interface RawOption {
  type: "raw"
  actualType: string | null
}

function kebabToCamel(kebab: string) {
  return kebab.replace(/-[a-z]/g, ([, c]) => c.toUpperCase());
}

function clone(x: any) {
  if (Array.isArray(x)) return x.slice()
  return x
}