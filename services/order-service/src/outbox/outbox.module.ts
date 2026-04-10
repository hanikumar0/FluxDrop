import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxService } from './services/outbox.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  providers: [OutboxService, PrismaService],
})
export class OutboxModule {}
