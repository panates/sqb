import { Injectable } from '@nestjs/common';
import { SqbClient } from '@sqb/connect';
import { InjectSQB } from '@sqb/nestjs';
import assert from 'assert';

@Injectable()
export class PhotoService {
  constructor(
    @InjectSQB('db1')
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
