import { Inject } from '@nestjs/common';
import { getSQBToken } from './sqb.utils.js';

export const InjectSQB: (name?: string) => ParameterDecorator = (
  name?: string,
) => Inject(getSQBToken(name));
