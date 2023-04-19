const assert = require('node:assert');
const eloManager = require('./elo');

const instance = new eloManager({
  gameName: 'test',
  redisClient: 'test',
  redisKeychain: 'test',
  PlayerHelper: 'test',
});

// ONLY VICTORIES VS 1500
let res = instance.getNewElo(1500, 1500, 'win');
assert.equal(res, 1516);

res = instance.getNewElo(res, 1500, 'win');
assert.equal(res, 1531);

res = instance.getNewElo(res, 1500, 'win');
assert.equal(res, 1546);

for (let i = 0; i < 100; i++) {
  res = instance.getNewElo(res, 1500, 'win');
}
assert.equal(res, 1994);

for (let i = 0; i < 1000; i++) {
  res = instance.getNewElo(res, 1500, 'win');
}
assert.equal(res, 2169);

// ONLY LOSSES  VS 1500
res = instance.getNewElo(1500, 1500, 'loss');
assert.equal(res, 1484);

res = instance.getNewElo(res, 1500, 'loss');
assert.equal(res, 1469);

res = instance.getNewElo(res, 1500, 'loss');
assert.equal(res, 1454);

for (let i = 0; i < 100; i++) {
  res = instance.getNewElo(res, 1500, 'loss');
}
assert.equal(res, 1006);

for (let i = 0; i < 1000; i++) {
  res = instance.getNewElo(res, 1500, 'loss');
}
assert.equal(res, 780);

// ONLY DRAW VS 1400
res = instance.getNewElo(1500, 1400, 'draw');
for (let i = 0; i < 10000; i++) {
  res = instance.getNewElo(res, 1400, 'draw');
}
assert.equal(res, 1410);

// ONLY DRAW VS 1600
res = instance.getNewElo(1500, 1600, 'draw');
for (let i = 0; i < 10000; i++) {
  res = instance.getNewElo(res, 1600, 'draw');
}
assert.equal(res, 1590);

// RANDOM VS 1500
res = 1500
for (let i = 0; i < 10000; i++) {
  res = instance.getNewElo(res, 1500, Math.random() < 0.5 ? 'win' : 'loss');
}

let isBetweenAandB = 1410 <= res && res <= 1590;
// console.log(res)
assert.equal(isBetweenAandB, true);

// RANDOM VS STRONGER OPPONENTS
res = 1500
for (let i = 0; i < 1000; i++) {
  res = instance.getNewElo(res, res + 200, Math.random() < 0.5 ? 'win' : 'loss');
//   console.log(res)
}

isBetweenAandB = 5200 <= res && res <= 6700;
// console.log(res)
assert.equal(isBetweenAandB, true);

// RANDOM VS WEAKER OPPONENTS
res = 1500
for (let i = 0; i < 1000; i++) {
  res = instance.getNewElo(res, res - 200 < 700 ? 700  : res - 200 , Math.random() < 0.5 ? 'win' : 'loss');
//   console.log(res)
}

isBetweenAandB = 500 <= res && res <= 800;
// console.log(res)
assert.equal(isBetweenAandB, true);

// SLIGHLTY VICTORIOUS VS STRONGER OPPONENTS
res = 1500
for (let i = 0; i < 100; i++) {
    res = instance.getNewElo(res, res + 100, Math.random() < 0.6 ? 'win' : 'loss');
  }
  
  isBetweenAandB = 2000 <= res && res <= 3000;
//   console.log(res)
  assert.equal(isBetweenAandB, true);

  console.log('ALL TEST PASSED')