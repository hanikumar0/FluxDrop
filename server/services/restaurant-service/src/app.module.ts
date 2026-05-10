import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantModule } from './restaurant/restaurant.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://admin:rootpassword@localhost:27017/fluxdrop_catalog?authSource=admin',
      }),
      inject: [ConfigService],
    }),
    RestaurantModule,
    CatalogModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
