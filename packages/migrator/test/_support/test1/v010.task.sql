CREATE SCHEMA IF NOT EXISTS $(schema);

CREATE TABLE $(schema).table1
(
    id integer NOT NULL,
    name varchar(256),
    CONSTRAINT table1_pkey PRIMARY KEY (id)
) TABLESPACE $(tablespace);

ALTER TABLE $(schema).table1 OWNER to $(owner);
