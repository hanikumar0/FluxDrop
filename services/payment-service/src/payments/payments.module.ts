import { Module } from '@nestjs/common';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { LedgerModule } from '../ledger/ledger.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [LedgerModule],
  controllers: [PaymentController],
  providers: [PaymentService, PrismaService],
})
export class PaymentsModule {}
