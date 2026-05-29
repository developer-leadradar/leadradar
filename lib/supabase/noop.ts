/**
 * No-op Supabase client for placeholder/missing credentials.
 * Returns empty data for all queries so the app renders without a real DB.
 */

const EMPTY = { data: [], count: 0, error: null }
const NULL_DATA = { data: null, count: null, error: null }

/**
 * A chainable query builder that always resolves to empty/null results.
 * Supports arbitrary method chains: .eq().gte().in().lt().not()...etc.
 */
class NoOpQuery {
  private _single: boolean

  constructor(single = false) {
    this._single = single
  }

  // All filter/modifier methods return `this` for chaining
  eq(_col: string, _val: unknown): this { return this }
  neq(_col: string, _val: unknown): this { return this }
  gt(_col: string, _val: unknown): this { return this }
  gte(_col: string, _val: unknown): this { return this }
  lt(_col: string, _val: unknown): this { return this }
  lte(_col: string, _val: unknown): this { return this }
  in(_col: string, _vals: unknown[]): this { return this }
  is(_col: string, _val: unknown): this { return this }
  ilike(_col: string, _val: unknown): this { return this }
  like(_col: string, _val: unknown): this { return this }
  or(_query: string): this { return this }
  not(_col: string, _op: string, _val: unknown): this { return this }
  filter(_col: string, _op: string, _val: unknown): this { return this }
  contains(_col: string, _val: unknown): this { return this }
  containedBy(_col: string, _val: unknown): this { return this }
  overlaps(_col: string, _val: unknown): this { return this }
  order(_col: string, _opts?: object): this { return this }
  limit(_n: number): this { return this }
  range(_from: number, _to: number): this { return this }
  match(_q: object): this { return this }
  select(_cols?: string, _opts?: object): this { return this }

  single(): NoOpQuery { return new NoOpQuery(true) }

  // Makes the query thenable (awaitable)
  then(
    onFulfilled?: (v: unknown) => unknown,
    _onRejected?: (e: unknown) => unknown
  ): Promise<unknown> {
    const result = this._single ? NULL_DATA : EMPTY
    const resolved = Promise.resolve(result)
    return onFulfilled ? resolved.then(onFulfilled) : resolved
  }
}

class NoOpTable {
  select(_cols?: string, _opts?: object): NoOpQuery { return new NoOpQuery() }

  insert(_data: unknown): NoOpQuery { return new NoOpQuery(true) }

  update(_data: unknown): NoOpQuery { return new NoOpQuery() }

  delete(): NoOpQuery { return new NoOpQuery() }

  upsert(_data: unknown): NoOpQuery { return new NoOpQuery() }
}

export function createNoOpClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: null,
      }),
      onAuthStateChange: (
        _event: string,
        _callback: (event: string, session: null) => void
      ) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: (_table: string) => new NoOpTable(),
    channel: (_name: string) => ({
      on: (_event: string, _filter: object, _cb?: () => void) => ({
        subscribe: (_cb?: () => void) => ({}),
      }),
      unsubscribe: () => {},
    }),
    removeChannel: (_channel: unknown) => {},
    rpc: (_fn: string, _args?: object) => new NoOpQuery(),
  }
}
