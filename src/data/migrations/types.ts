import { IDatabaseAdapter } from '../database/DatabaseAdapter';

export interface Migration {
  version: number;
  name: string;
  up(db: IDatabaseAdapter): Promise<void>;
}
