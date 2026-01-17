import { Injectable, InternalServerErrorException, ServiceUnavailableException } from "@nestjs/common";
import { createPublicClient, http, PublicClient } from "viem";
import { avalancheFuji } from "viem/chains";
import SIMPLE_STORAGE_ABI from './simple-storage.json';

@Injectable()
export class BlockchainService {
  private client: PublicClient;
  private contractAddress: `0x${string}`;

  constructor() {
    this.client = createPublicClient({
      chain: avalancheFuji,
      transport: http("https://api.avax-test.network/ext/bc/C/rpc"),
    });

    // GANTI dengan address hasil deploy Day 2
    this.contractAddress = "0x5f78729be75f6f9304b185c9d11ec64cba3dce4f" as "0x{String}";
  }

  // 🔹 Read latest value
  async getLatestValue() {
  try {
      const value = await this.client.readContract({
        address: this.contractAddress,
        abi: SIMPLE_STORAGE_ABI.abi,
        functionName: "getValue",
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

      const events = await this.client.getLogs({
        address: this.contractAddress,
        event: {
          type: 'event',
          name: 'ValueUpdated',
          inputs: [
            {
              name: 'newValue',
              type: 'uint256',
              indexed: false,
            },
          ],
        },
        fromBlock: BigInt(fromBlock ?? Number(latestBlock) - 1000),
        toBlock: BigInt(toBlock ?? Number(latestBlock)),
      });

      const sliced = events.slice(-limit);

      return {
        data: sliced.map((event) => ({
          blockNumber: event.blockNumber?.toString(),
          value: event.args.newValue?.toString(),
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

    console.log({error: message});

    if (message.includes("timeout")) {
      throw new ServiceUnavailableException(
        "RPC timeout. Silakan coba beberapa saat lagi."
      );
    }

    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("failed")
    ) {
      throw new ServiceUnavailableException(
        "Tidak dapat terhubung ke blockchain RPC."
      );
    }

    throw new InternalServerErrorException(
      "Terjadi kesalahan saat membaca data blockchain."
    );
  }

}