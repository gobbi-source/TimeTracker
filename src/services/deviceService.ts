import { IDatabaseAdapter } from '../data/database/DatabaseAdapter';
import { generateUuidV7, nowUtcIso } from '../domain/types/base';

export class DeviceService {
  private db: IDatabaseAdapter;
  private cachedDeviceId: string | null = null;

  constructor(db: IDatabaseAdapter) {
    this.db = db;
  }

  async getDeviceId(): Promise<string> {
    if (this.cachedDeviceId) {
      return this.cachedDeviceId;
    }

    const rows = await this.db.select<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      ['device_id']
    );

    if (rows.length > 0 && rows[0].value) {
      this.cachedDeviceId = rows[0].value;
      return this.cachedDeviceId;
    }

    const newId = `dev_${generateUuidV7()}`;
    const now = nowUtcIso();

    await this.db.execute(
      'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
      ['device_id', newId, now]
    );

    this.cachedDeviceId = newId;
    return newId;
  }
}
