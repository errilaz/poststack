import type {
    SelectQuery, InsertCommand, UpdateCommand, DeleteCommand, CallCommand,
    Condition
} from "@poststack/metadata"
import type { IFormatting } from "pg-promise"

export default class SqlGenerator {
  private format: IFormatting

  constructor(format: IFormatting) {
    this.format = format
  }

  select(select: SelectQuery) {
    const columns = select.selected?.map(this.format.name) || "*";
    const where = select.conditions && select.conditions.length > 0;
    const conditions = select.conditions?.map(c => this.generateCondition(c)).join(" and ") || "";
    const limit = select.limit ? `limit ${this.format.number(select.limit)}` : "";
    const offset = select.offset ? `offset ${this.format.number(select.offset)}` : "";
    const orderBy = select.orderBy === undefined ? ""
      : "order by " + select.orderBy.columns.map(this.format.name).join(", ")
      + select.orderBy.direction
    return `
      select ${columns}
      from ${select.table}
      ${where} ${conditions}
      ${limit}
      ${offset}
      ${orderBy}
    `;
  }

  private generateHeader(sessionToken: string) {
    return `
      set role 'api';
      select set_config('request.session_token', '${sessionToken}', true);
    `;
  }

  private generateCondition(condition: Condition) {
    if (condition.arity === 1) {
      return this.format.name(condition.column)
        + " " + condition.operator;
    }
    else {
      return this.format.name(condition.column)
        + " " + condition.operator + this.format.value(condition.value);
    }
  }
}
