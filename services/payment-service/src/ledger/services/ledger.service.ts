import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  async recordEntry(transactionId: string, type: 'DEBIT' | 'CREDIT', amount: number, description: string) {
    return this.prisma.ledgerEntry.create({
      data: {
        transactionId,
        type,
        amount,
        description,
      },
    });
  }
}
