const conf = require('./package.json')
await Bun.write('./pkg.json', `{ "version": "${conf.version}", "licence": "${conf.license}", "name": "${conf.name}" }`)