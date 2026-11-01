export interface QueryResult {
  rowsAffected: number;
  lastInsertId: number;
}

export interface IDatabaseAdapter {
  execute(query: string, bindValues?: unknown[]): Promise<QueryResult>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T[]>;
  transaction<T>(action: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
