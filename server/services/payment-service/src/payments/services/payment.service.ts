import { Injectable, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { LedgerService } from '../../ledger/services/ledger.service';
import { CreatePaymentIntentDto } from '../dtos';

@Injectable()
export class PaymentService {
  constructor(
    private db: DatabaseService,
    private ledgerService: LedgerService,
  ) {}

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    // 1. Check for existing transaction (Idempotency)
    const existingResult = await this.db.query(
      'SELECT * FROM "Transaction" WHERE "orderId" = $1',
      [dto.orderId],
    );

    if (existingResult.rowCount && existingResult.rowCount > 0) {
      return existingResult.rows[0];
    }

    // 2. Create Pending Transaction & Ledger Entry in a transaction
    const client = await this.db.query('BEGIN');
    try {
      const transactionResult = await this.db.query(
        'INSERT INTO "Transaction" (id, "orderId", "customerId", amount, provider, "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) RETURNING *',
        [dto.orderId, dto.customerId, dto.amount, dto.provider],
      );

      const transaction = transactionResult.rows[0];

      await this.db.query(
        'INSERT INTO "LedgerEntry" (id, "transactionId", type, amount, description, "createdAt") VALUES (gen_random_uuid(), $1, \'DEBIT\', $2, $3, NOW())',
        [transaction.id, dto.amount, `Payment intent created for order ${dto.orderId}`],
      );

      await this.db.query('COMMIT');
      return transaction;
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  async processWebhook(orderId: string, status: 'SUCCESS' | 'FAILED', providerRef: string) {
    const existingResult = await this.db.query(
      'SELECT * FROM "Transaction" WHERE "orderId" = $1',
      [orderId],
    );

    const transaction = existingResult.rows[0];

    if (!transaction || transaction.status !== 'PENDING') {
      return transaction;
    }

    await this.db.query('BEGIN');
    try {
      const updatedResult = await this.db.query(
        'UPDATE "Transaction" SET status = $1, "providerRef" = $2, "updatedAt" = NOW() WHERE "orderId" = $3 RETURNING *',
        [status === 'SUCCESS' ? 'SUCCESS' : 'FAILED', providerRef, orderId],
      );

      const updated = updatedResult.rows[0];

      if (status === 'SUCCESS') {
        await this.db.query(
          'INSERT INTO "LedgerEntry" (id, "transactionId", type, amount, description, "createdAt") VALUES (gen_random_uuid(), $1, \'CREDIT\', $2, $3, NOW())',
          [updated.id, updated.amount, `Payment successful for order ${orderId}`],
        );
      }

      await this.db.query('COMMIT');
      return updated;
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }
}
