import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../../ledger/services/ledger.service';
import { CreatePaymentIntentDto } from '../dtos/create-payment-intent.dto';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
  ) {}

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    // 1. Check for existing transaction (Idempotency)
    const existing = await this.prisma.transaction.findUnique({
      where: { orderId: dto.orderId },
    });

    if (existing) {
      return existing;
    }

    // 2. Create Pending Transaction & Ledger Entry in a transaction
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          orderId: dto.orderId,
          customerId: dto.customerId,
          amount: dto.amount,
          provider: dto.provider,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          type: 'DEBIT',
          amount: dto.amount,
          description: `Payment intent created for order ${dto.orderId}`,
        },
      });

      return transaction;
    });
  }

  async processWebhook(orderId: string, status: 'SUCCESS' | 'FAILED', providerRef: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { orderId },
    });

    if (!transaction || transaction.status !== 'PENDING') {
      return transaction;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { orderId },
        data: {
          status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
          providerRef,
        },
      });

      if (status === 'SUCCESS') {
        await tx.ledgerEntry.create({
          data: {
            transactionId: updated.id,
            type: 'CREDIT',
            amount: updated.amount,
            description: `Payment successful for order ${orderId}`,
          },
        });
      }

      return updated;
    });
  }
}
