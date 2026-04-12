import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentIntentDto } from '../dtos/create-payment-intent.dto';

@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('intent')
  async createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentService.createPaymentIntent(dto);
  }

  @Post('webhook/:orderId')
  async handleWebhook(
    @Param('orderId') orderId: string,
    @Body('status') status: 'SUCCESS' | 'FAILED',
    @Body('providerRef') providerRef: string,
  ) {
    return this.paymentService.processWebhook(orderId, status, providerRef);
  }
}
