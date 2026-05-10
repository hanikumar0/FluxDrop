import { Module } from '@nestjs/common';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { LedgerModule } from '../ledger/ledger.module';


@Module({
  imports: [LedgerModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentsModule {}
