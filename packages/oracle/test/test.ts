// noinspection SqlNoDataSourceInspection

import oracledb from 'oracledb';

async function main() {
  const config = {
    user: 'pntdba',
    password: 'pntdba',
    connectString: '192.168.35.23:1521/pnt',
  };
  oracledb.initOracleClient({ libDir: '/usr/local/etc/instant-client' });
  const connection = await oracledb.getConnection(config);
  // caches temizlemk için
  await connection.execute('ALTER SYSTEM FLUSH SHARED_POOL');
  await connection.execute('ALTER SYSTEM FLUSH BUFFER_CACHE');

  const sql = `
    SELECT *
    FROM hbys.birim_kayit t
    WHERE t.birim_id = 18848
      AND (
      t.giris_tarihi = TO_DATE('2023-01-01 00:00:00', 'yyyy-mm-dd hh24:mi:ss.SSSSS')
        AND t.agy = :P$_4
            AND EXISTS
                    (SELECT b.id
                       FROM hbys.birim b
                      WHERE b.id = t.birim_id AND b.parent_id = 2)
      )
`;

  const now = Date.now();
  const result = await connection.execute(
    sql,
    {
      // P$_1: 18848,
      // P$_2: '2023-01-01 00:00:00',
      // P$_3: '2023-01-01 00:00:00',
      P$_4: {
        type: oracledb.DB_TYPE_VARCHAR,
        dir: oracledb.BIND_IN,
        val: 'Y',
      },
      // P$_5: 0,
      // P$_6: 0,
      // P$_7: 3020,
      // P$_8: 0,
      // P$_9: 0,
      // P$_10: 0,
      // P$_12: 2,
    },
    {
      autoCommit: true,
      // keepInStmtCache: false,
      maxRows: 100,
    },
  );
  console.log(Date.now() - now + 'ms', result.rows?.length);
  const plansql = `SELECT *
                     FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(NULL, NULL, 'ALLSTATS LAST'))`;
  const plan = await connection.execute(plansql);
  console.log(plan.rows?.join('\n'));
}

main();
