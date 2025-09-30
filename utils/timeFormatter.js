/**
 * 时间格式化工具函数
 */

// 时间组件接口
const TimeComponents = {
  year: 0,
  month: 0,
  day: 0,
  hour: 0,
  minute: 0
};

/**
 * 格式化可读时间
 * @param {string} input - 格式为 YYYY/MM/DD/HH/mm 的时间字符串
 * @returns {string} 格式化后的可读时间
 */
export const formatReadableTime = (input) => {
  // 1. 解析输入时间并验证格式
  const parts = input.split('/');
  if (parts.length !== 5) {
      throw new Error('Invalid format, should be YYYY/MM/DD/HH/mm');
  }

  const components = {
    year: parseInt(parts[0]),
    month: parseInt(parts[1]),
    day: parseInt(parts[2]),
    hour: parseInt(parts[3]),
    minute: parseInt(parts[4])
  };

  // 验证数字有效性
  if (Object.values(components).some(isNaN)) {
      throw new Error('Invalid numbers');
  }

  // 2. 创建日期对象（注意月份从0开始）
  const inputDate = new Date(
      components.year,
      components.month - 1,
      components.day,
      components.hour,
      components.minute
  );
  
  // 验证日期有效性
  if (isNaN(inputDate.getTime())) {
      throw new Error('Invalid date');
  }

  const now = new Date();
  
  // 3. 计算时间差（毫秒）
  const timeDiff = now.getTime() - inputDate.getTime();
  const minuteDiff = Math.floor(timeDiff / (1000 * 60));
  const hourDiff = Math.floor(minuteDiff / 60);
  
  // 4. 辅助函数：获取日期部分（忽略时间）
  const getDateValue = (date) => 
      date.getFullYear() * 10000 + 
      (date.getMonth() + 1) * 100 + 
      date.getDate();
  
  // 5. 计算日期差
  const todayValue = getDateValue(now);
  const inputDateValue = getDateValue(inputDate);
  const dateDiff = todayValue - inputDateValue;
  
  // 6. 修改后的时间段格式化函数
  const formatTime = (h, m) => {
    const totalMinutes = h * 60 + m;
    
    // 定义时间段规则
    if (totalMinutes >= 0 && totalMinutes < 300) return "深夜";         // 00:00-05:00
    if (totalMinutes < 420) return "凌晨";                            // 05:00-07:00
    if (totalMinutes < 510) return "清晨";                            // 07:00-08:30
    if (totalMinutes < 600) return "早上";                            // 08:30-10:00
    if (totalMinutes < 690) return "上午";                            // 10:00-11:30
    if (totalMinutes < 780) return "中午";                            // 11:30-13:00
    if (totalMinutes < 900) return "午后";                            // 13:00-15:00
    if (totalMinutes < 1020) return "下午";                           // 15:00-17:00
    if (totalMinutes < 1140) return "傍晚";                           // 17:00-19:00
    if (totalMinutes < 1260) return "晚上";                           // 19:00-21:00
    if (totalMinutes < 1380) return "夜间";                           // 21:00-23:00
    return "午夜";                                                   // 23:00-00:00
  };
  
  // 7. 按优先级判断时间范围
  if (minuteDiff < 3) return "刚刚";  // 3分钟内
  
  if (dateDiff === 0) {  // 当天
      if (minuteDiff < 60) return `${minuteDiff}分钟前`;
      return `${hourDiff}小时前`;
  }
  
  if (dateDiff === 1) return `昨天 ${formatTime(components.hour, components.minute)}`;
  if (dateDiff === 2) return `前天 ${formatTime(components.hour, components.minute)}`;
  
  // 8. 处理更早时间
  const isCurrentYear = now.getFullYear() === components.year;
  
  return isCurrentYear
      ? `${components.month}月${components.day}日 ${formatTime(components.hour, components.minute)}`
      : `${components.year}年${components.month}月${components.day}日 ${formatTime(components.hour, components.minute)}`;
};

/**
 * 将Date对象转换为YYYY/MM/DD/HH/mm格式的字符串
 * @param {Date} date - 日期对象
 * @returns {string} 格式化的时间字符串
 */
export const dateToTimeString = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  return `${year}/${month}/${day}/${hour}/${minute}`;
};
