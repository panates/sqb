const {spawn} = require('child_process');
const npmRunPath = require('npm-run-path');
const minimist = require('minimist');
const colors = require('colors');

const argv = minimist(process.argv.slice(2), {
  string: ['package'],
  boolean: ['dev'],
  alias: {
    p: 'package',
    d: 'dev'
  }
});

function execSh(command, options) {
  const opts = {
    ...options,
    env: npmRunPath.env(),
    stdio: 'inherit',
    windowsHide: true
  };

  return new Promise((resolve, reject) => {
    let rejected;
    try {
      const cp = process.platform === 'win32' ?
          spawn('cmd', ['/C', command], opts)
          : spawn('sh', ['-c', command], opts);
      cp.on('error', (e) => {
        rejected = true;
        return reject(new Error(colors.red(`Command failed with code (${code})`) +
            `\n  ${colors.gray(command)}\n  ` + e.message));
      });
      cp.on('close', (code) => {
        if (!code)
          return resolve();
        if (!rejected) {
          return reject(new Error(colors.red(`Command failed with code (${code})`) +
              `\n  ${colors.gray(command)}`));
        }
      });
    } catch (e) {
      reject(e);
    }

  });
}

module.exports = {
  argv,
  execSh
};
