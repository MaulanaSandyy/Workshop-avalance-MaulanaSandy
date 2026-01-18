import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createPublicClient, http, PublicClient } from 'viem';
import { avalancheFuji } from 'viem/chains';
import SIMPLE_STORAGE_ABI from './simple-storage.json';

@Injectable()
export class BlockchainService {
  private client: PublicClient;
  private contractAddress: `0x${string}`;

  constructor() {
    if (!process.env.RPC_URL || !process.env.CONTRACT_ADDRESS) {
      throw new Error(
        'RPC_URL dan CONTRACT_ADDRESS harus diset di environment variables',
      );
    }

    this.client = createPublicClient({
      chain: avalancheFuji,
      transport: http(process.env.RPC_URL),
    });

    this.contractAddress =
      process.env.CONTRACT_ADDRESS as `0x${string}`;
  }

  // 🔹 Read latest stored value
  async getLatestValue() {
    try {
      const value = await this.client.readContract({
        address: this.contractAddress,
        abi: SIMPLE_STORAGE_ABI.abi,
        functionName: 'getValue',
      });

      return {
        data: {
          value: (value as bigint).toString(),
        },
      };
    } catch (error) {
      this.handleRpcError(error);
    }
  }

  // 🔹 Read ValueUpdated events
  async getValueUpdatedEvents(
    fromBlock?: number,
    toBlock?: number,
    limit = 10,
  ) {
    try {
      const latestBlock = await this.client.getBlockNumber();

      const startBlock =
        fromBlock ??
        Math.max(Number(latestBlock) - 1000, 0);

      const endBlock =
        toBlock ?? Number(latestBlock);

      const events = await this.client.getLogs({
        address: this.contractAddress,
        event: {
          type: 'event',
          name: 'ValueUpdated',
          inputs: [
            {
              name: 'newValue',
              type: 'uint256',
              indexed: false, // sesuaikan jika event di Solidity indexed
            },
          ],
        },
        fromBlock: BigInt(startBlock),
        toBlock: BigInt(endBlock),
      });

      const sliced = events.slice(-limit);

      return {
        data: sliced.map((event) => ({
          blockNumber: event.blockNumber?.toString(),
          value: event.args?.newValue?.toString(),
          txHash: event.transactionHash,
        })),
        meta: {
          total: events.length,
          limit,
        },
      };
    } catch (error) {
      this.handleRpcError(error);
    }
  }

  // 🔹 Centralized RPC Error Handler
  private handleRpcError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);

    console.error('Blockchain RPC Error:', message);

    if (message.includes('timeout')) {
      throw new ServiceUnavailableException(
        'RPC timeout. Silakan coba beberapa saat lagi.',
      );
    }

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('failed')
    ) {
      throw new ServiceUnavailableException(
        'Tidak dapat terhubung ke blockchain RPC.',
      );
    }

    throw new InternalServerErrorException(
      'Terjadi kesalahan saat membaca data blockchain.',
    );
  }
}
