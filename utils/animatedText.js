/**
 * animatedText.js
 * 将字符串转为带 delay 的字符数组，用于逐字 fadeIn 动画
 *
 * @param {string} text - 原始文本
 * @param {number} perCharDelay - 每个字符的延迟间隔（ms），默认 40
 * @param {number} startDelay - 整体起始延迟（ms），默认 0
 * @returns {Array<{char: string, delay: string}>}
 */
const PER_CHAR_DELAY = 85; // ms，调整这一处即可改变所有逐字动画速度

function buildCharList(text, perCharDelay = PER_CHAR_DELAY, startDelay = 0) {
  return text.split('').map((char, i) => ({
    char,
    delay: `${startDelay + i * perCharDelay}ms`
  }));
}

module.exports = { buildCharList, PER_CHAR_DELAY };
