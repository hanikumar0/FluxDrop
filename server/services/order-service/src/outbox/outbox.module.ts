import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxService } from './services/outbox.service';


@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  providers: [OutboxService],
})
export class OutboxModule {}
