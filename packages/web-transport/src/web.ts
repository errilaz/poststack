import type { ApiTransport, CallCommand, DeleteCommand, InsertCommand, SelectQuery, UpdateCommand } from "@poststack/metadata"

/** Passes queries to apiHandler over HTTP+JSON. */
export default class WebTransport implements ApiTransport {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = noTrailingSlash(baseUrl)
  }

  select(select: SelectQuery): Promise<any[]> {
    const qstring = encodeURIComponent(JSON.stringify(select))
    const url = `${this.baseUrl}/select?query=${qstring}`
    return request("get", url)
  }

  insert(insert: InsertCommand): Promise<any[]> {
    const url = `${this.baseUrl}/insert`
    return request("post", url, insert)
  }

  update(update: UpdateCommand): Promise<any[]> {
    const url = `${this.baseUrl}/update`
    return request("patch", url, update)
  }

  delete(del: DeleteCommand): Promise<any[]> {
    const url = `${this.baseUrl}/delete`
    return request("delete", url, del)
  }

  call(call: CallCommand): Promise<any> {
    const url = `${this.baseUrl}/call`
    return request("post", url, call)
  }
}

function noTrailingSlash(s: string) {
  return s.endsWith("/") ? s.substring(s.length - 1) : s
}

async function request(method: string, url: string, body?: any) {
  const request: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" }
  }
  if (body) request.body = body
  return await (await fetch(url, request)).json()
}
