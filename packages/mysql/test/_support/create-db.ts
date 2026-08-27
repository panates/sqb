import mysql from 'mysql2/promise';
import { getInsertSQLsForTestData } from '../../../connect/test/_shared/adapter-tests.js';

const schemaCreated: Record<string, boolean> = {};

function getSql(): string {
  return `
CREATE TABLE IF NOT EXISTS continents
(
    code varchar(5),
    name varchar(16),
    PRIMARY KEY (code)
);

CREATE TABLE IF NOT EXISTS countries
(
    code varchar(5),
    name varchar(16),
    phone_code varchar(8),
    continent_code varchar(2),
    has_market tinyint(1) not null default 1,
    PRIMARY KEY (code),
    CONSTRAINT fk_countries_continent_code FOREIGN KEY (continent_code)
        REFERENCES continents (code)
);

CREATE TABLE IF NOT EXISTS customers
(
    id INTEGER AUTO_INCREMENT,
    given_name varchar(64),
    family_name varchar(64),
    gender char(1),
    birth_date date,
    city varchar(32),
    country_code varchar(5),
    active tinyint(1) not null default 1,
    vip tinyint(1) not null default 0,
    address_city varchar(32),
    address_street varchar(256),
    address_zip_code varchar(8),
    custom_data json,
    created_at timestamp default CURRENT_TIMESTAMP,
    updated_at timestamp null default null on update CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_customers_country_code FOREIGN KEY (country_code)
        REFERENCES countries (code)
) AUTO_INCREMENT = 10000;

CREATE TABLE IF NOT EXISTS customer_details
(
    customer_id INTEGER,
    notes varchar(256),
    alerts varchar(256),
    PRIMARY KEY (customer_id),
    CONSTRAINT fk_customer_details_id FOREIGN KEY (customer_id)
        REFERENCES customers (id)
);

CREATE TABLE IF NOT EXISTS customer_vip_details
(
    customer_id INTEGER,
    \`rank\` smallint default 0,
    notes varchar(256),
    PRIMARY KEY (customer_id),
    CONSTRAINT fk_customer_vip_details_id FOREIGN KEY (customer_id)
        REFERENCES customers (id)
);

CREATE TABLE IF NOT EXISTS tags
(
    id INTEGER AUTO_INCREMENT,
    name varchar(16),
    color varchar(16),
    active tinyint(1) not null default 1,
    PRIMARY KEY (id)
) AUTO_INCREMENT = 100;

CREATE TABLE IF NOT EXISTS customer_tags
(
    customer_id INTEGER not null,
    tag_id INTEGER not null,
    deleted tinyint(1) not null default 0,
    PRIMARY KEY (customer_id, tag_id),
    CONSTRAINT fk_customer_tags_customer_id FOREIGN KEY (customer_id)
        REFERENCES customers (id),
    CONSTRAINT fk_customer_tags_tag_id FOREIGN KEY (tag_id)
        REFERENCES tags (id)
);

CREATE TABLE IF NOT EXISTS parents
(
    id INTEGER AUTO_INCREMENT,
    name varchar(64),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS children
(
    id INTEGER AUTO_INCREMENT,
    name varchar(64),
    parent_id INTEGER,
    PRIMARY KEY (id),
    CONSTRAINT fk_children_parent_id FOREIGN KEY (parent_id)
        REFERENCES parents (id)
);

CREATE TABLE IF NOT EXISTS grandchildren
(
    id INTEGER AUTO_INCREMENT,
    name varchar(64),
    child_id INTEGER,
    PRIMARY KEY (id),
    CONSTRAINT fk_grandchildren_child_id FOREIGN KEY (child_id)
        REFERENCES children (id)
);
`;
}

export async function createTestSchema(database: string) {
  if (schemaCreated[database]) return;
  schemaCreated[database] = true;
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT
      ? parseInt(process.env.MYSQL_PORT, 10)
      : undefined,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD,
    multipleStatements: true,
  });
  try {
    await connection.query(`DROP DATABASE IF EXISTS ${database}`);
    await connection.query(`CREATE DATABASE ${database}`);
    await connection.query(`USE ${database}`);
    await connection.query(getSql());
    const dataFiles = getInsertSQLsForTestData({ dialect: 'mysql' });
    for (const table of dataFiles) {
      for (const script of table.scripts) {
        // Insert()'s column list is not passed through reserved-word
        // escaping (unlike SELECT/RETURNING), so `rank` — reserved in
        // MySQL 8.0+ for window functions — must be quoted by hand here.
        await connection.query(script.replace(/\brank\b/g, '`rank`'));
      }
    }
  } finally {
    await connection.end();
  }
}
