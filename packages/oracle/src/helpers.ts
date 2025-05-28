import { ClientConfiguration } from '@sqb/connect';
import { ConnectionAttributes } from 'oracledb';
import url from 'url';

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
