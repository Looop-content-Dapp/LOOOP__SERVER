import { HermesClient } from "@pythnetwork/hermes-client";
import crypto from "crypto";
import dotenv from "dotenv";
import {
  Account,
  CallData,
  constants,
  Contract,
  ec,
  hash,
  RpcProvider,
  shortString,
  stark,
  uint256,
  Abi,
  Uint256,
  TransactionReceipt,
  GetTransactionResponse,
  GetBlockResponse,
  GetTransactionReceiptResponse,
  TransactionStatusReceiptSets,
} from "starknet";
import { erc20 } from "@/Abis/erc20abi";
import { factoryAbi } from "@/Abis/factory_abi";
import { nftAbi } from "@/Abis/nftAbi";
import { usdcAbi } from "@/Abis/usdc_abi";
import { prisma } from "@/config/database";
import {
  WalletInfo,
  WalletData,
  ArtistWalletInfo,
  ConstructorCalldata,
  EncryptionResult,
  TransactionResult,
  USDCBalance,
  WalletFundingResult,
  WalletDeploymentResult,
} from "../types/wallet.types.js";
import { createError } from "@/middleware/errorHandler";
import { deployWallet } from "cavos-service-sdk";

dotenv.config();

interface ContractInfo {
  address: string;
  method: string;
  result?: any;
  timestamp: number;
  status: string;
  error?: string;
}

interface Collection {
  collectionId: number;
  name: string;
  symbol: string;
  artist: string;
  address: string;
  createdAt: string;
  housePercentage: number;
  artistPercentage: number;
  collectionInfo: string;
}

/**
 * Service for interacting with Starknet contracts
 */
export default class StarknetService {
  private provider: RpcProvider;
  private Factory: string;
  private usdcAddress: string;
  private hermesClient: HermesClient;
  private usdcPriceId: string;
  private funderAccount: Account;

  constructor() {
    const nodeUrl =
      "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_6/SJrfoNSORPvz7PkhNneqhqTpnielFNxS";
    console.log(`Initializing StarkNet provider with node URL: ${nodeUrl}`);

    this.provider = new RpcProvider({
      nodeUrl,
      retries: 1,
    });
    this.Factory =
      "0x01506d709e65937451c344c59e6a122f7427e4a63a7792017d0ad16e787b49c0";
    this.usdcAddress =
      "0x0475e85c9f471885c1624c297862df9aaffa82ad55c7d1fde1ac892232445e06";
    this.hermesClient = new HermesClient("https://hermes.pyth.network", {});
    this.usdcPriceId =
      "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a";
    this.funderAccount = new Account(
      this.provider,
      "0x0620fd15e0b464c174933b5235c72a50376379ee1528719848e144385d0a1ed4",
      "0x05d67e95f8d5913249452a410db389110c390a36eb0e2ecb092c670ba945b8b9",
      undefined,
      constants.TRANSACTION_VERSION.V3
    );
  }

  /**
   * Initialize a contract instance
   * @param contractAddress - The contract address
   * @param abi - The contract ABI
   * @returns Contract instance
   */
  getContract(contractAddress: string, abi: Abi): Contract {
    return new Contract(abi, contractAddress, this.provider);
  }

  /**
   * Create an account instance
   * @param privateKey - The private key
   * @param accountAddress - The account address
   * @returns Account instance
   */
  getAccount(privateKey: string, accountAddress: string): Account {
    return new Account(this.provider, accountAddress, privateKey);
  }

  stringToByteArray(str: string): { data: string[]; pending_word: string; pending_word_len: string } {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const felts: string[] = [];
    for (let i = 0; i < bytes.length; i += 31) {
      const chunk = bytes.slice(i, i + 31);
      let felt = 0n;
      for (let j = 0; j < chunk.length; j++) {
        felt = (felt << 8n) + BigInt(chunk[j]);
      }
      felts.push("0x" + felt.toString(16));
    }
    return {
      data: felts,
      pending_word: "0",
      pending_word_len: "0",
    };
  }

  /**
   * Call a read-only method on a contract
   * @param contractAddress - The contract address
   * @param method - The method name
   * @param calldata - The call data
   * @returns The result with contract details
   */
  async callContract(contractAddress: string, method: string, calldata: any[] = []): Promise<{
    contractInfo: ContractInfo;
    result: any;
  }> {
    try {
      const { abi: contractAbi } = await this.provider.getClassAt(contractAddress);
      const contract = this.getContract(contractAddress, contractAbi);
      console.log(`Contract instance created for address ${contractAddress}`);

      const result = await contract.call(method, calldata);
      console.log(`Result of calling contract method ${method}:`, result);

      return {
        contractInfo: {
          address: contractAddress,
          method,
          result,
          timestamp: Date.now(),
          status: "success",
        },
        result,
      };
    } catch (error: any) {
      console.error(`Error calling contract method ${method}:`, error);
      return {
        contractInfo: {
          address: contractAddress,
          method,
          timestamp: Date.now(),
          status: "failed",
          error: error.message,
        },
        result: null,
      };
    }
  }

  /**
   * Create a collection by retrieving the user's wallet using email
   * @param email - The user's email address
   * @param calldata - The calldata for the transaction
   * @returns Transaction result
   */
  async executeCreateCollection(
    email: string,
    calldata: { collectibleName: string; communitySymbol: string }
  ): Promise<TransactionResult> {
    const account = await this.getUserWalletInfo(email);
    console.log("account", account);
    const account0 = new Account(
      this.provider,
      account.address,
      account.privateKey,
      undefined,
      constants.TRANSACTION_VERSION.V3
    );
    try {
      const contract = this.getContract(this.Factory, factoryAbi);
      contract.connect(account0);
      console.log(`Contract instance created for address ${this.Factory}`);

      const myCall = contract.populate("create_collection", [
        account.address,
        calldata.collectibleName,
        calldata.communitySymbol,
        calldata.collectibleName,
      ]);

      const res = await contract.create_collection(myCall.calldata);
      console.log(`Transaction for method create_collection executed with hash:`, res);
      const receipt: any = await this.provider.waitForTransaction(res.transaction_hash);
      console.log(`Transaction receipt for method create_collection:`, receipt);

      const mintEvent = receipt.events[1];
      console.log("mint event", mintEvent);
      const eventData = {
        recipientAddress: mintEvent.data[0],
        tokenId: parseInt(mintEvent.data[1], 16),
        param: parseInt(mintEvent.data[2], 16),
        contractAddress: parseInt(mintEvent.data[2], 16),
        blockNumber: receipt.block_number,
        transactionHash: receipt.transaction_hash,
        status: receipt.execution_status,
      };
      console.log("eventdata", eventData);

      return {
        transactionHash: res.transaction_hash,
        receipt,
        eventData,
        mintEvent,
      };
    } catch (error: any) {
      console.error(`Error executing transaction for method create_collection:`, error);
      throw error;
    }
  }

  async getCollectionDetails(address: string): Promise<{
    status: string;
    data: { collections: Collection[]; totalCollections: number };
  }> {
    try {
      const contract = this.getContract(this.Factory, factoryAbi);
      console.log(`Contract instance created for address ${this.Factory}`);

      const details = contract.populate("get_artist_collections", [address]);
      const res = await contract.get_artist_collections(details.calldata);
      console.log(`Transaction for method get_collection executed with hash:`, res);

      const formattedCollections: Collection[] = res.map((collection: any) => ({
        collectionId: Number(collection.collection_id),
        name: this.feltToString(collection.name),
        symbol: this.feltToString(collection.symbol),
        artist: `0x${collection.artist.toString(16)}`,
        address: `0x${collection.address.toString(16)}`,
        createdAt: new Date(Number(collection.created_at) * 1000).toISOString(),
        housePercentage: Number(collection.house_percentage),
        artistPercentage: Number(collection.artist_percentage),
        collectionInfo: this.feltToString(collection.collection_info),
      }));

      return {
        status: "success",
        data: {
          collections: formattedCollections,
          totalCollections: formattedCollections.length,
        },
      };
    } catch (error: any) {
      console.error(`Error executing transaction for method get_collection:`, error);
      throw error;
    }
  }

  /**
   * Execute a transaction on a StarkNet smart contract
   * @param email - The user's email
   * @param contractAddress - The contract address
   * @returns Transaction result
   */
  async executeMint(email: string, contractAddress: string): Promise<TransactionResult> {
    const account = await this.getUserWalletInfo(email);
    console.log("account", account);

    const account0 = new Account(
      this.provider,
      account.address,
      account.privateKey,
      undefined,
      constants.TRANSACTION_VERSION.V3
    );
    try {
      const contract = this.getContract(contractAddress, nftAbi);
      contract.connect(account0);
      console.log(`Contract instance created for address ${contractAddress}`);

      const myCall = contract.populate("mint_ticket_nft", [5000000, this.usdcAddress]);
      const res = await contract.mint_ticket_nft(myCall.calldata);
      console.log(`Transaction for method mint_ticket_nft executed with hash:`, res);
      const receipt: any = await this.provider.waitForTransaction(res.transaction_hash);
      console.log(`Transaction receipt for method mint_pass:`, receipt);

      const mintEvent = receipt.events[1];
      const eventData = {
        recipientAddress: mintEvent.data[0],
        tokenId: parseInt(mintEvent.data[1], 16),
        param: parseInt(mintEvent.data[2], 16),
        contractAddress: mintEvent.from_address,
        blockNumber: receipt.block_number,
        transactionHash: receipt.transaction_hash,
        status: receipt.execution_status,
      };

      return {
        transactionHash: res.transaction_hash,
        receipt,
        eventData,
        mintEvent,
      };
    } catch (error: any) {
      console.error(`Error executing transaction for method mint_pass:`, error);
      throw error;
    }
  }

  async whiteList(email: string, contractAddress: string): Promise<TransactionResult> {
    const account = await this.getUserWalletInfo(email);
    console.log("account", account);
    try {
      const contract = this.getContract(contractAddress, nftAbi);
      contract.connect(this.funderAccount);
      console.log(`Contract instance created for address ${contractAddress}`);

      const myCall = contract.populate("whitelist_address", [account.address]);
      const res = await contract.whitelist_address(myCall.calldata);
      console.log(`Transaction for method whitelist_address executed with hash:`, res);
      const receipt: any = await this.provider.waitForTransaction(res.transaction_hash);
      console.log(`Transaction receipt for method whitelist_address:`, receipt);

      const mintEvent = receipt.events[1];
      const eventData = {
        recipientAddress: mintEvent.data[0],
        tokenId: parseInt(mintEvent.data[1], 16),
        param: parseInt(mintEvent.data[2], 16),
        contractAddress: mintEvent.from_address,
        blockNumber: receipt.block_number,
        transactionHash: receipt.transaction_hash,
        status: receipt.execution_status,
      };

      return {
        transactionHash: res.transaction_hash,
        receipt,
        eventData,
        mintEvent,
      };
    } catch (error: any) {
      console.error(`Error executing transaction for method mint_pass:`, error);
      throw error;
    }
  }

  /**
   * Get transaction status
   * @param txHash - The transaction hash
   * @returns The transaction status
   */
  async getTransactionStatus(txHash: string): Promise<GetTransactionResponse> {
    try {
      const tx = await this.provider.getTransaction(txHash);
      return tx;
    } catch (error: any) {
      console.error(`Error getting transaction status for ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Get transaction receipt
   * @param txHash - The transaction hash
   * @returns The transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<GetTransactionReceiptResponse<keyof TransactionStatusReceiptSets>> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error: any) {
      console.error(`Error getting transaction receipt for ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Get block information
   * @param blockIdentifier - Block hash or number
   * @returns Block information
   */
  async getBlock(blockIdentifier: string | number): Promise<GetBlockResponse> {
    try {
      const block = await this.provider.getBlock(blockIdentifier);
      return block;
    } catch (error: any) {
      console.error(`Error getting block ${blockIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * Generate a new key pair
   * @returns The key pair
   */
  generateKeyPair(): { privateKey: string; publicKey: string } {
    try {
      if (typeof ec.starkCurve.getStarkKey === "function") {
        const privateKey = stark.randomAddress();
        const starkKey = ec.starkCurve.getStarkKey(privateKey);
        const publicKey = ec.starkCurve.getStarkKey(starkKey);
        return { privateKey, publicKey };
      }
      throw new Error("No compatible method found to generate key pair");
    } catch (error: any) {
      console.error("Error generating key pair:", error);
      throw error;
    }
  }

  /**
   * Convert a string to felt
   * @param str - The string to convert
   * @returns The felt representation
   */
  stringToFelt(str: string): bigint[] {
    const size = Math.ceil(str.length / 31);
    const arr = Array(size);

    let offset = 0;
    for (let i = 0; i < size; i++) {
      const substr = str.substring(offset, offset + 31).split("");
      const ss = substr.reduce((memo, c) => memo + c.charCodeAt(0).toString(16), "");
      arr[i] = BigInt("0x" + ss);
      offset += 31;
    }
    return arr;
  }

  /**
   * Convert a felt to string
   * @param felt - The felt to convert
   * @returns The string representation
   */
  feltToString(felt: string): string {
    return shortString.decodeShortString(felt);
  }

  /**
   * Parse uint256 value
   * @param uint256Value - The uint256 value from contract
   * @returns The parsed value as string
   */
  parseUint256(uint256Value: Uint256): string {
    return uint256.uint256ToBN(uint256Value).toString();
  }

  /**
   * Create a Starknet wallet for a user
   * @param email - The user's email address
   * @returns The wallet information
   */
  async createUserWallet(email: string) {
  try {
    console.log("Deploying wallet for user:", email);
    const deploywallet = await deployWallet('sepolia', process.env.CAVOS_API_SECRET);
    console.log("Deployed wallet:", deploywallet);

    console.log("Starknet wallet deployed successfully:", {
      email,
      address: deploywallet.address,
      hasEncryptedKey: !!deploywallet.privateKey,
    });

    return {
      address: deploywallet.address,
      privateKey: deploywallet.private_key,
      publickey: deploywallet.public_key, // Update this line to use public_key
    };
  } catch (error: any) {
    console.error("Error creating Starknet wallet for user:", error);
    throw error;
  }
}

  /**
   * Deploy a Starknet wallet and fund it
   * @param email - The user's email
   * @param funderAddress - Address to fund the wallet
   * @param funderPrivateKey - Private key of the funder
   * @param amount - Amount to fund in wei
   * @returns The deployment and funding result
   */

  /**
   * Fund a Starknet wallet with ETH
   * @param recipientAddress - The wallet address to fund
   * @param funderAddress - The funder's address
   * @param funderPrivateKey - The funder's private key
   * @param amount - Amount to transfer in wei
   * @returns The funding transaction result
   */
  async fundUserWallet(
    recipientAddress: string,
    funderAddress: string = "0x0620fd15e0b464c174933b5235c72a50376379ee1528719848e144385d0a1ed4",
    funderPrivateKey: string = "0x05d67e95f8d5913249452a410db389110c390a36eb0e2ecb092c670ba945b8b9",
    amount: number = 10000000000000000000
  ): Promise<{ transactionHash: string; status: string; amount: number }> {
    try {
      const funderAccount = new Account(
        this.provider,
        funderAddress,
        funderPrivateKey,
        undefined,
        constants.TRANSACTION_VERSION.V3
      );
      const ethContractAddress =
        "0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D";
      const ethContract = this.getContract(ethContractAddress, erc20);
      ethContract.connect(funderAccount);

      const transferCall = ethContract.populate("transfer", [recipientAddress, amount]);
      const res = await ethContract.transfer(transferCall.calldata);
      console.log("Funding transaction hash:", res);

      const receipt: any = await this.provider.waitForTransaction(res.transaction_hash);
      console.log("Funding transaction receipt:", receipt);

      return {
        transactionHash: res.transaction_hash,
        status: receipt?.status || "ACCEPTED_ON_L2",
        amount,
      };
    } catch (error: any) {
      console.error("Error funding wallet:", error);
      throw new Error(`Failed to fund wallet: ${error.message}`);
    }
  }

  async mintTestUsdcToUser(email: string): Promise<{ success: boolean; transactionHash: string }> {
    try {
      const user = await this.getUserWalletInfo(email);
      if (!user || !user.address) {
        throw new Error("User or Starknet wallet address not found");
      }

      const recipientAddress = user.address;
      const usdcContract = this.getContract(this.usdcAddress, usdcAbi);
      usdcContract.connect(this.funderAccount);

      const call = await usdcContract.populate("mint", [recipientAddress, 100000000]);
      const { transaction_hash: transferTxHash } = await usdcContract.mint(call.calldata);

      console.log("USDC Mint Transaction Hash:", transferTxHash);
      await this.provider.waitForTransaction(transferTxHash);
      console.log("Test USDC minted successfully");
      return { success: true, transactionHash: transferTxHash };
    } catch (error: any) {
      console.error("Error minting test USDC:", error);
      throw error;
    }
  }

  /**
   * Encrypt a private key
   * @param privateKey - The private key to encrypt
   * @returns The encryption result
   */
  encryptPrivateKey(privateKey: string): EncryptionResult {
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(
      process.env.SERVER_SECRET || "your-secret-key",
      salt,
      100000,
      32,
      "sha256"
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(privateKey, "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
      encrypted,
      iv: iv.toString("hex"),
      salt: salt.toString("hex"),
    };
  }

  /**
   * Decrypt a private key
   * @param encrypted - The encrypted private key
   * @param iv - The initialization vector
   * @param salt - The salt used in encryption
   * @returns The decrypted private key
   */
  decryptPrivateKey(encrypted: string, iv: string, salt: string): string {
    if (!encrypted || !iv || !salt) {
      throw new Error("Missing required parameters for decryption");
    }

    const saltBuffer = Buffer.from(salt, "hex");
    const ivBuffer = Buffer.from(iv, "hex");
    const key = crypto.pbkdf2Sync(
      process.env.SERVER_SECRET || "your-secret-key",
      saltBuffer,
      100000,
      32,
      "sha256"
    );
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, ivBuffer);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  /**
   * Get transaction details
   * @param txHash - The transaction hash
   * @returns Complete transaction details
   */
  async getTransactionDetails(txHash: string): Promise<{
    transaction: GetTransactionResponse;
    receipt: TransactionReceipt;
    blockInfo: GetBlockResponse | null;
    status: string;
    executionStatus: string;
    finalityStatus: string;
    timestamp: number | null;
    events: any[];
  }> {
    try {
      const transaction: any = await this.provider.getTransaction(txHash);
      const receipt: any = await this.provider.getTransactionReceipt(txHash);
      let blockInfo = null;
      if (transaction?.block_number) {
        blockInfo = await this.provider.getBlock(transaction.block_number);
      }

      return {
        transaction,
        receipt,
        blockInfo,
        status: receipt.status,
        executionStatus: receipt.execution_status,
        finalityStatus: receipt.finality_status,
        timestamp: blockInfo ? blockInfo.timestamp : null,
        events: receipt.events || [],
      };
    } catch (error: any) {
      console.error(`Error getting transaction details for ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve user's wallet information
   * @param email - The user's email address
   * @returns The wallet information
   */
  async getUserWalletInfo(email: string): Promise<WalletInfo> {
    try {
      const wallet = await prisma.wallet.findUnique({ where: { email } });

      // Validate wallet exists
      if (!wallet) {
        throw new Error("No wallet found for user");
      }

      // Validate encryption fields are present
      if (!wallet.encryptedPrivateKey) {
        throw new Error("Wallet encrypted private key is missing. Please recreate the wallet.");
      }


      // Return standard WalletInfo
      return {
        address: wallet.address,
        privateKey: wallet.encryptedPrivateKey,
        publickey: wallet.publickey
      };
    } catch (error: any) {
      console.error("Error retrieving wallet information:", error);
      throw error;
    }
  }

  async getStarkNetUSDCBalance(starknetAddress: string, usdcAddress: string | null = null): Promise<USDCBalance> {
    try {
      const USDC_ADDRESS =
        usdcAddress ||
        "0x0475e85c9f471885c1624c297862df9aaffa82ad55c7d1fde1ac892232445e06";
      const contract = new Contract(usdcAbi, USDC_ADDRESS, this.provider);
      const response = await contract.balance_of(starknetAddress);
      console.log("response", response);

      const balance = response;
      if (!this.parseUint256(balance)) {
        return {
          address: starknetAddress,
          balance: "0",
          balanceFloat: 0,
          usdcPrice: 1,
          usdValue: 0,
        };
      }
      const parsedBalance = this.parseUint256(balance);
      console.log("parsedBalance", parsedBalance);
      const balanceFloat = Number(this.parseUint256(balance)) / 1e6;
      console.log("balanceFloat", balanceFloat);

      const priceUpdate = await this.hermesClient.getLatestPriceUpdates([this.usdcPriceId]);
      const pythPrice = priceUpdate.parsed[0]?.price;
      const usdcPrice = pythPrice
        ? Number(pythPrice.price) / Math.pow(10, Math.abs(pythPrice.expo))
        : 1;

      return {
        address: starknetAddress,
        balance: balance.toString(),
        balanceFloat,
        usdcPrice,
        usdValue: balanceFloat * usdcPrice,
        response,
      };
    } catch (error: any) {
      console.error("Error fetching StarkNet USDC balance:", error);
      throw new Error("Failed to fetch StarkNet USDC balance");
    }
  }

  /**
   * Execute a USDC transfer from user to artist
   * @param senderEmail - The sender's email address
   * @param recipientAddress - The recipient's StarkNet address
   * @param amount - Amount of USDC to transfer (in smallest unit, e.g. 1000000 for 1 USDC)
   * @returns Transaction result
   */
  async executeUSDCTransfer(
    senderEmail: string,
    recipientAddress: string,
    amount: number
  ): Promise<TransactionResult> {
    try {
      const senderAccount = await this.getUserWalletInfo(senderEmail);
    //   if (!senderAccount.isDeployed) {
    //     throw new Error("Sender's wallet is not deployed");
    //   }

      const account0 = new Account(
        this.provider,
        senderAccount.address,
        senderAccount.privateKey,
        undefined,
        constants.TRANSACTION_VERSION.V3
      );

      const contract = this.getContract(this.usdcAddress, usdcAbi);
      contract.connect(account0);

      const senderBalance = await this.getStarkNetUSDCBalance(senderAccount.address);
      if (senderBalance.balanceFloat * 1e6 < amount) {
        throw new Error("Insufficient USDC balance");
      }

      const transferCall = contract.populate("transfer", [recipientAddress, uint256.bnToUint256(amount)]);
      const res = await contract.transfer(transferCall.calldata);
      console.log("USDC transfer transaction hash:", res);

      const receipt: any = await this.provider.waitForTransaction(res.transaction_hash);
      console.log("USDC transfer transaction receipt:", receipt);

      const details = await this.getTransactionDetails(res.transaction_hash);

      return {
        transactionHash: res.transaction_hash,
        receipt,
        details,
        status: receipt.execution_status,
        amount,
        from: senderAccount.address,
        to: recipientAddress,
      };
    } catch (error: any) {
      console.error("Error executing USDC transfer:", error);
      throw error;
    }
  }
}

export const starknetService = new StarknetService();
