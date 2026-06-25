import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBankDetailsDto {
  @IsNotEmpty({ message: 'Account holder name is required' })
  @IsString()
  holderName!: string;

  @IsNotEmpty({ message: 'Bank name is required' })
  @IsString()
  bankName!: string;

  @IsNotEmpty({ message: 'Account number is required' })
  @IsString()
  accountNumber!: string;

  @IsNotEmpty({ message: 'Branch location is required' })
  @IsString()
  branch!: string;
}

export class UpdateRefundSettingsDto {
  @IsNotEmpty({ message: 'Refund policy statement is required' })
  @IsString()
  refundPolicy!: string;

  @IsNotEmpty({ message: 'Auto approval setting is required' })
  @IsBoolean()
  autoApproveSmall!: boolean;

  @IsNotEmpty({ message: 'Max instant claim limit is required' })
  @IsNumber()
  @Min(0)
  maxRefundLimit!: number;
}

export class ResolveRefundDto {
  @IsNotEmpty({ message: 'Outcome is required' })
  @IsString()
  outcome!: 'Approve' | 'Reject';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateManualRefundDto {
  @IsNotEmpty({ message: 'Order number is required' })
  @IsString()
  orderNumber!: string;

  @IsNotEmpty({ message: 'Customer name is required' })
  @IsString()
  customerName!: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsNotEmpty({ message: 'Reason is required' })
  @IsString()
  reason!: string;

  @IsNotEmpty({ message: 'Status is required' })
  @IsString()
  status!: string;
}

export class UpdateRefundStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsString()
  status!: string;
}
