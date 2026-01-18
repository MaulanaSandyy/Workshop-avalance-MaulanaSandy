import { Controller, Get, Query } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { GetEventsDto } from './dto/get-events.dto';

@Controller('blockchain')
export class BlockchainController {
  constructor(
    private readonly blockchainService: BlockchainService,
  ) {}

  // GET /blockchain/value
  @Get('value')
  async getValue() {
    return this.blockchainService.getLatestValue();
  }

  // GET /blockchain/events?fromBlock=...&toBlock=...&limit=10
  @Get('events')
  async getEvents(
    @Query() query: GetEventsDto,
  ) {
    return this.blockchainService.getValueUpdatedEvents(
      query.fromBlock,
      query.toBlock,
      query.limit,
    );
  }
}
