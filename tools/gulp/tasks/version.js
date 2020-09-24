const path = require('path');
const fs = require('fs');
const colors = require('colors');
const semver = require('semver');
const {packages} = require('../common');

function versionPackage(pkg, version) {
  pkg.json.version = version;
  const data = JSON.stringify(pkg.json, null, 2);
  fs.writeFileSync(path.join(pkg.dirname, 'package.json'), data, 'utf-8');
}

function version(option) {
  return async function() {
    const p = path.resolve(__dirname, '../../../package.json');
    const json = JSON.parse(fs.readFileSync(p, 'utf-8'));
    json.version = semver.inc(json.version, option);
    fs.writeFileSync(p, JSON.stringify(json, null, 2), 'utf-8');
    console.log(`Updating version to "${colors.magenta(json.version)}"`);
    for (const pkg of packages) {
      versionPackage(pkg, json.version);
    }
  };
}

module.exports = {
  tasks: {
    'version': version('patch'),
    'version:patch': version('patch'),
    'version:minor': version('minor'),
    'version:major': version('major')
  }
};
