import { Prisma } from '@prisma/client';
import { GetBlockResponse, GetTransactionResponse, TransactionReceipt } from 'starknet';

/**
 * Wallet information interface compatible with Prisma Json type
 * Flattened structure without nested 'starknet' object
 */
export interface WalletInfo {
  address: string;
  privateKey: string;
  publickey: string;
}

/**
 * Wallet data stored in database (compatible with Prisma schema)
 */
export interface WalletData {
  email: string;
  address: string;
  encryptedPrivateKey?: string | null;
  iv?: string | null;
  salt?: string | null;
  recoveryToken?: string | null;
  recoveryTokenExpiry?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isDeployed: boolean;
  constructorCalldata?: Prisma.JsonValue;
}

/**
 * Flattened artist wallet info (no nested starknet object)
 */
export interface ArtistWalletInfo {
  address?: string;
  isDeployed?: boolean;
  encryptedPrivateKey?: string;
  iv?: string;
  salt?: string;
  constructorCalldata?: Prisma.JsonValue;
  addressSalt?: string;
  classHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Constructor calldata type that fits Prisma Json constraints
 */
export type ConstructorCalldata =
  | string[]
  | number[]
  | Record<string, unknown>
  | null
  | undefined;

/**
 * Encryption result for private key storage
 */
export interface EncryptionResult {
  encrypted: string;
  iv: string;
  salt: string;
}

/**
 * Wallet creation request
 */
export interface CreateWalletRequest {
  email: string;
  password?: string;
}

/**
 * Wallet deployment request
 */
export interface DeployWalletRequest {
  email: string;
  funderAddress?: string;
  funderPrivateKey?: string;
  amount?: number;
}

/**
 * Wallet funding result
 */
export interface WalletFundingResult {
  transactionHash: string;
  status: string;
  amount: number;
}

/**
 * Wallet deployment result
 */
export interface WalletDeploymentResult {
  address: string;
  transactionHash?: string;
  fundingTransactionHash?: string;
  status?: string;
  message: string;
}

/**
 * USDC balance information
 */
export interface USDCBalance {
  address: string;
  balance: string;
  balanceFloat: number;
  usdcPrice: number;
  usdValue: number;
  response?: unknown;
}

export interface  TransactionDetails {
    transaction: GetTransactionResponse;
    receipt: TransactionReceipt;
    blockInfo: GetBlockResponse | null;
    status: string;
    executionStatus: string;
    finalityStatus: string;
    timestamp: number | null;
    events: any[];
}

/**
 * Transaction result interface
 */
export interface TransactionResult {
  transactionHash: string;
  eventData?: unknown;
  mintEvent?: unknown;
  details?: TransactionDetails;
  status?: string;
  amount?: number;
  from?: string;
  to?: string;
}
