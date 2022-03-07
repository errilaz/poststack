import type * as pg from "pg-promise"
import { ApiTransport, CallCommand, DeleteCommand, InsertCommand, SelectQuery, UpdateCommand } from "@poststack/metadata";
import SqlGenerator from "@poststack/sql-generator";

type Database<T = any> = pg.IBaseProtocol<T>;

export class DbTransport implements ApiTransport {
  private db: Database
  private sql: SqlGenerator

  constructor(db: Database, format: pg.IFormatting) {
    this.db = db
    this.sql = new SqlGenerator(format)
  }

  async select(select: SelectQuery) {
    return this.db.any(this.sql.select(select))
  }

  insert(command: InsertCommand): Promise<any[]> {
    throw new Error("Method not implemented.");
  }

  update(command: UpdateCommand): Promise<any[]> {
    throw new Error("Method not implemented.");
  }

  delete(command: DeleteCommand): Promise<any[]> {
    throw new Error("Method not implemented.");
  }

  call(command: CallCommand): Promise<any> {
    throw new Error("Method not implemented.");
  }
}
