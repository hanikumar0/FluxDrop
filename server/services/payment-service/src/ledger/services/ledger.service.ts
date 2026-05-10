import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class LedgerService {
  constructor(private db: DatabaseService) {}

  async recordEntry(transactionId: string, type: 'DEBIT' | 'CREDIT', amount: number, description: string) {
    return this.db.query(
      'INSERT INTO "LedgerEntry" (id, "transactionId", type, amount, description, "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())',
      [transactionId, type, amount, description],
    );
  }
}
