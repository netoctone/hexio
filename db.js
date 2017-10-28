const redis = require('redis');

const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const client = redis.createClient(url);
client.on('error', (err) => {
  logError(err);
});

function logError(err) {
  console.log(`redis ${url} error: ${err}`);
}

const KEY_STEPS = 'hexio:stats:steps:';
const KEY_PLAYERS = 'hexio:stats:players:';

function saveGameStats(steps, players) {
  client.incr(`${KEY_STEPS}${steps}`);
  client.incr(`${KEY_PLAYERS}${players}`);
}

function command(name, ...args) {
  return new Promise((resolve, reject) => {
    client[name].apply(client, args.concat((err, result) => {
      if (err) {
        reject(`command '${name}' with args ${JSON.stringify(args)} - ${err}`);
      } else {
        resolve(result);
      }
    }));
  });
}

function getGameStats(cb) {
  Promise.all([
    command('keys', `${KEY_STEPS}*`),
    command('keys', `${KEY_PLAYERS}*`)
  ]).then(([keysSteps, keysPlayers]) => {
    return Promise.all([
      Promise.all(keysSteps.map((key) => {
        return command('get', key).then((val) => [key.substring(KEY_STEPS.length), val]);
      })),
      Promise.all(keysPlayers.map((key) => {
        return command('get', key).then((val) => [key.substring(KEY_PLAYERS.length), val]);
      }))
    ]);
  }).then(([statsSteps, statsPlayers]) => {
    cb({ steps: statsSteps, players: statsPlayers });
  }).catch((err) => {
    logError(err);
    cb({});
  });
}

module.exports = {
  saveGameStats,
  getGameStats
};
