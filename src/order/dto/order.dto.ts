import { IsString, IsNotEmpty, IsNumber, IsOptional, ValidateNested, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class ContactDto {
  @IsNotEmpty({ message: 'Contact name is required' })
  @IsString()
  name!: string;

  @IsNotEmpty({ message: 'Contact phone is required' })
  @IsString()
  phone!: string;

  @IsNotEmpty({ message: 'Contact email is required' })
  @IsString()
  email!: string;
}

export class CreateOrderDto {
  @IsNotEmpty({ message: 'restaurantId is required' })
  @IsString()
  restaurantId!: string;

  @IsNotEmpty({ message: 'restaurantName is required' })
  @IsString()
  restaurantName!: string;

  @IsNotEmpty({ message: 'orderType is required' })
  @IsString()
  orderType!: "Delivery" | "Self Pickup";

  @IsNotEmpty({ message: 'subtotal is required' })
  @IsNumber()
  subtotal!: number;

  @IsNotEmpty({ message: 'tax is required' })
  @IsNumber()
  tax!: number;

  @IsNotEmpty({ message: 'deliveryFee is required' })
  @IsNumber()
  deliveryFee!: number;

  @IsNotEmpty({ message: 'total is required' })
  @IsNumber()
  total!: number;

  @IsNotEmpty({ message: 'paymentMethod is required' })
  @IsString()
  paymentMethod!: "cash" | "card";

  @IsNotEmpty({ message: 'contact info is required' })
  @IsObject()
  @ValidateNested()
  @Type(() => ContactDto)
  contact!: ContactDto;

  @IsNotEmpty({ message: 'deliveryAddress is required' })
  @IsString()
  deliveryAddress!: string;

  @IsNotEmpty({ message: 'locationLabel is required' })
  @IsString()
  locationLabel!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  cardNumber?: string;

  @IsOptional()
  @IsString()
  cardExpiry?: string;

  @IsOptional()
  @IsString()
  cardCvc?: string;
}

export class UpdateOrderStatusDto {
  @IsNotEmpty({ message: 'status is required' })
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @IsOptional()
  @IsBoolean()
  refundInitiated?: boolean;
}

