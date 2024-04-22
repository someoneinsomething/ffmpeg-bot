function getRandomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Генерация случайного значения для параметра яркости
function getRandomBrightness() {
  return getRandomInRange(-1, 1).toFixed(8); // До восьми знаков после запятой
}

module.exports = { getRandomBrightness };
