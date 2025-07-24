CREATE TABLE $(schema).table2
(
    id integer NOT NULL,
    name varchar(256),
    CONSTRAINT table2_pkey PRIMARY KEY (id)
) TABLESPACE $(tablespace);

ALTER TABLE $(schema).table2 OWNER to $(owner);
