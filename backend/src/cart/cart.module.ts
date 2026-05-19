import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Module({
  imports: [ConfigModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
