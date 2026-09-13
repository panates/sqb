import type { ClientConfiguration } from '@sqb/connect';
import type { ConnectionAttributes } from 'oracledb';
import url from 'url';

/**
 * Converts a `@sqb/connect` {@link ClientConfiguration} into `oracledb`'s
 * `ConnectionAttributes`, building the driver's single `connectString`
 * (`host:port/database`) from the separate `host`/`port`/`database`
 * fields - `config.host` is parsed as a URL (defaulting to an `oracle://`
 * scheme if none is given) so it can alternatively carry the port,
 * database, and even embedded `user:password` credentials all in one
 * string. Any explicit `user`/`password`/`port`/`database` option takes
 * precedence over what's embedded in `host`, and embedded credentials are
 * ignored entirely when `externalAuth` is set.
 */
export function clientConfigurationToDriver(
  config: ClientConfiguration,
): ConnectionAttributes {
  const cfg: ConnectionAttributes = {
    user: config.user,
    password: config.password,
    ...config.driverOptions,
  };

  if (config.host) {
    let hostUrl = config.host || 'localhost';
    if (!hostUrl.includes('://')) hostUrl = 'oracle://' + hostUrl;

    const parsed = url.parse(hostUrl, true);
    const host = decodeURI(parsed.hostname || '');
    const port =
      config.port || (parsed.port && parseInt(parsed.port, 10)) || 1521;
    const database =
      config.database ||
      (parsed.pathname && decodeURI(parsed.pathname.substring(1)));
    cfg.connectString = `${host}:${port}${database ? '/' + database : ''}`;
    if (!cfg.externalAuth) {
      if (parsed.auth) {
        const a = parsed.auth.split(':');
        if (!cfg.user && a[0]) cfg.user = a[0];
        if (!cfg.password && a[1]) cfg.password = a[1];
      }
    }
  }

  return cfg;
}
