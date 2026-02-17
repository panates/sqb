import { Inject, Injectable } from '@nestjs/common';
import { SqbClient } from '@sqb/connect';
import assert from 'assert';

@Injectable()
export class PhotoService {
  constructor(
    @Inject('db1')
    private readonly client: SqbClient,
  ) {}

  async create(): Promise<any> {
    // noinspection SuspiciousTypeOfGuard
    assert(this.client instanceof SqbClient);
    return {
      name: 'Nest',
      description: 'Is great!',
      views: 6000,
    };
  }
}
