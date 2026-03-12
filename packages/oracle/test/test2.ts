// noinspection SqlNoDataSourceInspection

import '../src/index.js';
import { Select, op, Count } from '@sqb/builder';
import { SqbClient } from '@sqb/connect';

async function main() {
  const client = new SqbClient({
    dialect: 'oracle',
    host: '192.168.35.23',
    schema: 'hbys',
    user: 'pntdba',
    password: 'pntdba',
    database: 'pnt',
  });
  await client.test();
  // await client.execute('ALTER SYSTEM FLUSH SHARED_POOL');
  // await client.execute('ALTER SYSTEM FLUSH BUFFER_CACHE');

  const query = Select(Count())
    .from('birim_kayit t')
    .where(
      // op.eq('t.giris_tarihi', new Date('2024-01-03 00:00:00')),
      op.gte('t.baslama_zamani', new Date('2024-01-03 00:00:00')),
      op.lte('t.baslama_zamani', new Date('2024-01-03 23:59:59')),
    );
  const result = await client.execute(query, {
    fetchRows: 100,
    showSql: true,
  });
  console.log(result);

  const plansql = `SELECT *
                     FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(NULL, NULL, 'ALLSTATS LAST'))`;
  const plan = await client.execute(plansql, {
    objectRows: false,
  });
  console.log(plan.rows?.join('\n'));
  await client.close();
}

main().catch(console.error);
