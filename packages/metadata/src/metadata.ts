/* Communication interface for ApiClient. */
export interface ApiTransport {
  select(select: SelectQuery): Promise<any[]>;
  insert(insert: InsertCommand): Promise<any[]>;
  update(update: UpdateCommand): Promise<any[]>;
  delete(del: DeleteCommand): Promise<any[]>;
  call(call: CallCommand): Promise<any>;
}

// Schema

export interface SchemaData {
  tables: TableData[];
  types: TypeData[];
  enums: EnumData[];
  functions: FuncData[];
}

export type TsType = 
| "boolean"
| "number"
| "string"
| "Date"
| ["enum", EnumData]
| ["interface", TypeData]
| ["array", TsType];

export interface TableData {
  name: string;
  tsName: string;
  columns: AttributeData[];
}

export interface TypeData {
  name: string;
  tsName: string;
  attributes: AttributeData[];
}

export interface AttributeData {
  name: string;
  order: number;
  nullable: boolean;
  tsType: TsType;
}

export interface EnumData {
  name: string;
  tsName: string;
  fields: FieldData[];
}

export interface FieldData {
  name: string;
  order: number;
}

export interface FuncData {
  name: string;
  parameters: AttributeData[];
  returnType: TsType;
}

// Queries and commands

/** Represents a select query. */
export interface SelectQuery {
  table: string;
  limit?: number;
  offset?: number;
  conditions?: Condition[];
  selected?: string[];
  orderBy?: {
    columns: string[];
    direction: "asc" | "desc";
  }
}

/** Represents an update command. */
export interface UpdateCommand {
  table: string;
  conditions?: Condition[];
  returning?: string[];
}

/** Represents an insert command. */
export interface InsertCommand {
  table: string;
  returning?: string[];
}

/** Represents a delete command. */
export interface DeleteCommand {
  table: string;
  conditions?: Condition[];
  returning?: string[];
}

/** Represents a function call. */
export interface CallCommand {
  procedure: string;
  parameters?: any[];
}

/* Represents a condition. */
export type Condition =
| UnaryCondition
| BinaryCondition;

export interface UnaryCondition {
  column: string;
  arity: 1;
  operator: UnaryOperator;
}

export interface BinaryCondition {
  column: string
  arity: 2;
  operator: BinaryOperator;
  value: any;
}

export type UnaryOperator =
| "is null"
| "is not null";

export type BinaryOperator =
| "="
| ">"
| "<"
| ">="
| "<=";


