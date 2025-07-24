import { before } from 'node:test';
import { Connection } from 'postgrejs';

before(async () => {
  if (process.env.INIT_POSTGRES) {
    const connection = new Connection();
    await connection.connect();
    try {
      await connection.execute(
        'DROP SCHEMA IF EXISTS test_sqb_connect CASCADE',
      );
      await connection.execute(
        'DROP SCHEMA IF EXISTS test_sqb_postgres CASCADE',
      );
    } finally {
      await connection.close(0);
    }
  }
});
