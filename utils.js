function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomInRange(minValues, maxValues) {
  const index = Math.floor(Math.random() * minValues.length);
  const min = minValues[index];
  const max = maxValues[index];
  return Math.random() * (max - min) + min;
}

// Генерация случайного значения для параметра яркости
// function getRandomBrightness() {
//   return getRandom(-0.07, 0.07).toFixed(8);
// }

// function getRandomSaturation() {
//   return getRandom(0.93, 1.07).toFixed(8);
// }

function getRandomNoise() {
  return getRandom(3, 7).toFixed(4);
}

function getRandomBrightness() {
  const minValues = [-0.05, 0.01];
  const maxValues = [-0.01, 0.05];
  return getRandomInRange(minValues, maxValues).toFixed(8);
}

function getRandomSaturation() {
  const minValues = [0.95, 1.01];
  const maxValues = [0.99, 1.05];
  return getRandomInRange(minValues, maxValues).toFixed(8);
}

function tweakResolution({ width, height }) {
  const minPercentageChange = 0.03; // Минимальное изменение на 3%
  const maxPercentageChange = 0.1; // Максимальное изменение на 10%

  const percentageChange = getRandom(minPercentageChange, maxPercentageChange);

  const newWidth = Math.round(width * (1 - percentageChange));
  const newHeight = Math.round(height * (1 - percentageChange));
  return { newWidth, newHeight };
}

module.exports = {
  getRandomBrightness,
  getRandomSaturation,
  tweakResolution,
  getRandomNoise,
};
