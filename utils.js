function getRandomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Генерация случайного значения для параметра яркости
function getRandomBrightness() {
  return getRandomInRange(-0.07, 0.07).toFixed(8);
}

function getRandomSaturation() {
  return getRandomInRange(0.93, 1.07).toFixed(8);
}

module.exports = { getRandomBrightness, getRandomSaturation };
