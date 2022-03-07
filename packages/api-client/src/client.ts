import type {
  SchemaData, TableData, FuncData,
  ApiTransport,
  SelectQuery, InsertCommand, UpdateCommand, DeleteCommand, CallCommand,
  UnaryOperator, BinaryOperator, Condition
} from "@poststack/metadata"

/* Basic shape of generated API. */
export interface ApiBase<Tables, Functions> {
  tables: Tables;
  functions: Functions;
  schema: SchemaData;
}

/* Query building interface. */
export type ApiClient<Api extends ApiBase<Api["tables"], Api["functions"]>> =
& TablesClient<Api["tables"]>
& FunctionsClient<Api["functions"]>;

export type TablesClient<Tables> = { [Table in keyof Tables]: TableApi<Tables[Table]> };
export type FunctionsClient<Functions> = { [Function in keyof Functions]: Functions[Function] };

export module ApiClient {
  const define = (o: any, p: string, value: any) => Object.defineProperty(o, p, { value, enumerable: true });
  
  export function create<Api extends ApiBase<Api["tables"], Api["functions"]>>(api: Api, transport: ApiTransport): ApiClient<Api> {
    const client: Partial<ApiClient<Api>> = {};
    for (const table of api.schema.tables) {
      define(client, table.name, new ClientTableApi(transport, table));
    }
    for (const func of api.schema.functions) {
      define(client, func.name, functionApi(transport, func));
    }
    return client as ApiClient<Api>;
  }
}

/* Table functions. */
export interface TableApi<Table> {
  select(all: "*"): Select<Table, Table>;
  select<Column extends (keyof Table)>(columns: Column[]): Select<Pick<Table, Column>, Table>;
  insert(row: Partial<Table>): Insert<Table, Table, number>;
  insert<Column extends (keyof Table)>(columns: Column[], rows: Pick<Table, Column>[]): Insert<Column, Table, number>;
  update(row: Partial<Table>): Update<Table, number>;
  delete(): Delete<Table, number>;
}

/* Represents where clause. */
export interface HasWhereClause<Table> {
  where<Column extends keyof Table>(column: Column, value: Table[Column]): this;
  where<Column extends keyof Table>(column: Column, operator: UnaryOperator): this;
  where<Column extends keyof Table>(column: Column, operator: BinaryOperator, value: Table[Column]): this;
}

/** Select query builder. */
export interface Select<Columns, Table> extends HasWhereClause<Table> {
  fetch(): Promise<Columns[]>;
  limit(n: number): this;
  offset(n: number): this;
  orderBy<Column extends (keyof Table)>(columns: Column[], direction?: "asc" | "desc"): this;
}

/** Insert command builder. */
export interface Insert<Columns, Table, Returning> {
  execute(): Promise<Returning>;
  returning(all: "*"): Insert<Columns, Table, Table[]>;
  returning<Column extends (keyof Table)>(columns: Column[]): Insert<Columns, Table, Pick<Table, Column>[]>;
}

/** Update command builder. */
export interface Update<Table, Returning> extends HasWhereClause<Table> {
  execute(): Promise<Returning>;
  returning(all: "*"): Update<Table, Table[]>;
  returning<Column extends (keyof Table)>(columns: Column[]): Update<Table, Pick<Table, Column>[]>;
}

/** Delete command builder. */
export interface Delete<Table, Returning> extends HasWhereClause<Table> {
  execute(): Promise<Returning>;
  returning(all: "*"): Delete<Table, Table[]>;
  returning<Column extends (keyof Table)>(columns: Column[]): Delete<Table, Pick<Table, Column>[]>;
}

class ClientTableApi implements TableApi<any> {
  private transport: ApiTransport;
  private table: TableData;

  constructor(transport: ApiTransport, table: TableData) {
    this.transport = transport;
    this.table = table;
  }

  select(all: "*"): Select<any, any>;
  select<Column extends string>(columns: Column[]): Select<Pick<any, any>, any>;
  select(columns: string | string[]): Select<any, any> | Select<Pick<any, any>, any> {
    return new SelectBuilder(this.transport, this.table, columns);
  }

  insert(row: Partial<any>): Insert<any, any, number>;
  insert<Column extends string | number | symbol>(columns: Column[], rows: Pick<any, Column>[]): Insert<Column, any, number>;
  insert(columns: any, rows?: any): Insert<any, any, number> | Insert<any, any, number> {
    return new InsertBuilder(this.transport, this.table, columns, rows);
  }

  update(row: Partial<any>): Update<any, number> {
    return new UpdateBuilder(this.transport, this.table, row);
  }

  delete(): Delete<TableData, number> {
    return new DeleteBuilder(this.transport, this.table);
  }
}

class SelectBuilder implements Select<any, any> {
  transport: ApiTransport;
  table: TableData;
  query: SelectQuery;

  constructor(transport: ApiTransport, table: TableData, columns: string | string[]) {
    this.transport = transport;
    this.table = table;
    this.query = { table: table.name };
    if (Array.isArray(columns)) {
      this.query.selected = columns;
    }
  }

  fetch(): Promise<any[]> {
    return this.transport.select(this.query);
  }

  limit(n: number) {
    this.query.limit = n;
    return this;
  }

  offset(n: number) {
    this.query.offset = n;
    return this;
  }

  where(column: string, value: any): this;
  where(column: string, operator: UnaryOperator): this;
  where(column: string, operator: BinaryOperator, value: any): this;
  where(column: string, operator: any, value?: any) {
    where(column, this.query, operator, value);
    return this;
  }

  orderBy<Column extends string | number | symbol>(columns: Column[], direction?: "asc" | "desc"): this {
    if (direction !== "asc" && direction !== "desc") {
      throw new Error(`Invalid orderBy direction: "${direction}".`)
    }
    this.query.orderBy = {
      columns: columns as string[],
      direction: direction || "asc",
    };
    return this;
  }
}

class InsertBuilder implements Insert<any, any, any> {
  transport: ApiTransport;
  table: TableData;
  command: InsertCommand;

  constructor(transport: ApiTransport, table: TableData, rowOrColumns: any, rows: any) {
    this.transport = transport;
    this.table = table;
    this.command = { table: table.name };
  }

  execute(): Promise<any> {
    return this.transport.insert(this.command);
  }

  returning(all: "*"): Insert<any, any, any[]>;
  returning(columns: string[]): Insert<any, any, Pick<any, any>[]>;
  returning(columns: "*" | string[]) {
    this.command.returning = columns === "*" ? ["*"] : columns;
    return this;
  }
}

class UpdateBuilder implements Update<any, any> {
  transport: ApiTransport;
  table: TableData;
  command: UpdateCommand;

  constructor(transport: ApiTransport, table: TableData, row: any) {
    this.transport = transport;
    this.table = table;
    this.command = { table: table.name };
  }

  execute(): Promise<any> {
    return this.transport.update(this.command);
  }

  returning(all: "*"): Update<any, any[]>;
  returning(columns: string[]): Update<any, Pick<any, any>[]>;
  returning(columns: any): Update<any, any[]> | Update<any, Pick<any, any>[]> {
    this.command.returning = columns === "*" ? ["*"] : columns;
    return this;
  }

  where(column: string, value: any): this;
  where(column: string, operator: UnaryOperator): this;
  where(column: string, operator: BinaryOperator, value: any): this;
  where(column: any, operator: any, value?: any): this {
    where(column, this.command, operator, value);
    return this;
  }
}

class DeleteBuilder implements Delete<any, any> {
  transport: ApiTransport;
  table: TableData;
  command: DeleteCommand;

  constructor(transport: ApiTransport, table: TableData) {
    this.transport = transport;
    this.table = table;
    this.command = { table: table.name }
  }

  execute(): Promise<any> {
    return this.transport.update(this.command);
  }

  returning(all: "*"): Delete<any, any[]>;
  returning(columns: string[]): Delete<any, Pick<any, any>[]>;
  returning(columns: any): Delete<any, any[]> | Delete<any, Pick<any, any>[]> {
    this.command.returning = columns === "*" ? ["*"] : columns;
    return this;
  }

  where(column: string, value: any): this;
  where(column: string, operator: UnaryOperator): this;
  where(column: string, operator: BinaryOperator, value: any): this;
  where(column: any, operator: any, value?: any): this {
    where(column, this.command, operator, value);
    return this;
  }
}

function functionApi(transport: ApiTransport, func: FuncData) {
  return (...parameters: any[]) => {
    return transport.call({ procedure: func.name, parameters });
  };
}

function where(column: string, query: { conditions?: Condition[] }, operator: any, value?: any) {
  if (query.conditions === undefined) query.conditions = [];
  if (value !== undefined && isBinaryOperator(operator)) {
    query.conditions.push({ column, arity: 2, operator, value });
  }
  else if (isUnaryOperator(operator)) {
    query.conditions.push({ column, arity: 1, operator });
  }
  else {
    query.conditions.push({ column, arity: 2, operator: "=", value: operator });
  }
}

const unaryOperators = [
  "is null",
  "is not null",
];

function isUnaryOperator(o: string) {
  return unaryOperators.indexOf(o) !== -1;
}

const binaryOperators = [
  "=",
  ">",
  "<",
  ">=",
  "<=",
];

function isBinaryOperator(o: string) {
  return binaryOperators.indexOf(o) !== -1;
}
