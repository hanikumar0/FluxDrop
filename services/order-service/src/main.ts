import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // 1. TCP Transport (Synchronous commands from API Gateway)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3001, // Unique per service
    },
  });

  // 2. RabbitMQ Transport (Asynchronous Event Subscriptions)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URI || 'amqp://admin:rootpassword@localhost:5672'],
      queue: 'order_service_queue',
      queueOptions: {
        durable: true,
      },
      prefetchCount: 1, // Process one message at a time for sagas
    },
  });

  // 3. Start Hybrid App (Starts TCP + RMQ + Health Check HTTP server)
  await app.startAllMicroservices();
  
  // HTTP Port for Kubernetes Probes (Terminus Health Checks)
  const port = process.env.PORT || 8081;
  await app.listen(port);
  console.log(`Order Service is running via TCP/RMQ and HTTP on port ${port}`);
}
bootstrap();
