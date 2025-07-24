CREATE TABLE $(schema).table4
(
    id integer NOT NULL,
    name varchar(256),
    CONSTRAINT table4_pkey PRIMARY KEY (id)
) TABLESPACE $(tablespace);

ALTER TABLE $(schema).table4 OWNER to $(owner);
