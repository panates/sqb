import type { Adapter, RowType } from '@sqb/connect';
import { Cursor } from 'postgrejs';

export class PgCursor extends Cursor implements Adapter.Cursor {
  // @ts-ignore
  override rowType: RowType;

  static create(cursor: Cursor): PgCursor {
    const out = {
      rowType: cursor.rowType === 'array' ? 'array' : 'object',
    };
    Object.setPrototypeOf(out, cursor);
    return out as PgCursor;
  }
}
