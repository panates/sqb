const { Connection } = require('postgrejs');

module.exports = async function createSchema() {
  const connection = new Connection();
  await connection.connect();
  try {
    await connection.execute('DROP SCHEMA IF EXISTS test_sqb_connect CASCADE');
  } finally {
    await connection.close(0);
  }
};
