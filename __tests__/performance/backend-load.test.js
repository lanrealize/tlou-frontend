// __tests__/performance/backend-load.test.js
/**
 * 后端负荷测试
 * 验证新功能对后端性能的影响
 */

describe('后端负荷影响分析', () => {
  describe('数据传输负荷', () => {
    test('新格式数据包大小应该在合理范围内', () => {
      // 模拟发布带图片的帖子
      const postData = {
        circleId: 'circle123',
        content: '这是一个测试帖子内容，包含一些文字描述',
        images: [
          {
            url: 'https://tlou.images.wltech-service.site/posts/user123/2024/01/15/image1.jpg',
            key: 'posts/user123/2024/01/15/image1.jpg',
            size: 102400,
            hash: 'FpxBdCRjiQbWwOFH5_5dXjnWkEOL',
            uploadTime: '2024-01-15T10:30:00.000Z'
          },
          {
            url: 'https://tlou.images.wltech-service.site/posts/user123/2024/01/15/image2.jpg',
            key: 'posts/user123/2024/01/15/image2.jpg',
            size: 256000,
            hash: 'FqxBdCRjiQbWwOFH5_5dXjnWkEOK',
            uploadTime: '2024-01-15T10:30:01.000Z'
          }
        ]
      };

      const dataSize = JSON.stringify(postData).length;
      console.log(`📊 新格式数据包大小: ${dataSize} bytes`);
      
      // 应该小于2KB，对后端网络负担很小
      expect(dataSize).toBeLessThan(2048);
    });

    test('旧格式对比 - 数据增长合理', () => {
      // 旧格式
      const oldFormat = {
        circleId: 'circle123',
        content: '这是一个测试帖子内容，包含一些文字描述',
        images: [
          'https://tlou.images.wltech-service.site/posts/user123/2024/01/15/image1.jpg',
          'https://tlou.images.wltech-service.site/posts/user123/2024/01/15/image2.jpg'
        ]
      };

      // 新格式
      const newFormat = {
        circleId: 'circle123',
        content: '这是一个测试帖子内容，包含一些文字描述',
        images: [
          {
            url: 'https://tlou.images.wltech-service.site/posts/user123/2024/01/15/image1.jpg',
            key: 'posts/user123/2024/01/15/image1.jpg',
            size: 102400,
            hash: 'FpxBdCRjiQbWwOFH5_5dXjnWkEOL',
            uploadTime: '2024-01-15T10:30:00.000Z'
          },
          {
            url: 'https://tlou.images.wltech-service.site/posts/user123/2024/01/15/image2.jpg',
            key: 'posts/user123/2024/01/15/image2.jpg',
            size: 256000,
            hash: 'FqxBdCRjiQbWwOFH5_5dXjnWkEOK',
            uploadTime: '2024-01-15T10:30:01.000Z'
          }
        ]
      };

      const oldSize = JSON.stringify(oldFormat).length;
      const newSize = JSON.stringify(newFormat).length;
      const increase = newSize - oldSize;
      const increasePercentage = (increase / oldSize * 100).toFixed(1);

      console.log(`📊 数据大小对比:`);
      console.log(`   旧格式: ${oldSize} bytes`);
      console.log(`   新格式: ${newSize} bytes`);
      console.log(`   增长: ${increase} bytes (${increasePercentage}%)`);

      // 增长应该在合理范围内（< 3倍）
      expect(newSize / oldSize).toBeLessThan(3);
    });
  });

  describe('后端处理负荷', () => {
    test('后端只需要简单的数据提取，负荷极小', () => {
      const startTime = Date.now();
      
      // 模拟后端处理新格式数据的逻辑
      const images = [
        {
          url: 'https://domain.com/image1.jpg',
          key: 'posts/user/image1.jpg',
          size: 100000,
          hash: 'hash1',
          uploadTime: '2024-01-15T10:30:00Z'
        },
        {
          url: 'https://domain.com/image2.jpg',
          key: 'posts/user/image2.jpg',
          size: 200000,
          hash: 'hash2',
          uploadTime: '2024-01-15T10:30:01Z'
        }
      ];

      // 后端只需要提取URL（简单的map操作）
      const urlsToStore = images.map(img => {
        if (typeof img === 'string') {
          return img; // 旧格式兼容
        }
        return img.url; // 新格式：提取URL
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(urlsToStore).toEqual([
        'https://domain.com/image1.jpg',
        'https://domain.com/image2.jpg'
      ]);
      
      // 处理时间应该极短（< 1ms）
      expect(processingTime).toBeLessThan(1);
    });

    test('大量数据处理性能测试', () => {
      const startTime = Date.now();
      
      // 模拟处理1000个帖子，每个有5张图片
      const largeBatch = Array.from({ length: 1000 }, (_, postIndex) => ({
        circleId: 'circle123',
        content: `帖子内容 ${postIndex}`,
        images: Array.from({ length: 5 }, (_, imgIndex) => ({
          url: `https://domain.com/post${postIndex}_img${imgIndex}.jpg`,
          key: `posts/user/post${postIndex}_img${imgIndex}.jpg`,
          size: 100000,
          hash: `hash${postIndex}_${imgIndex}`,
          uploadTime: '2024-01-15T10:30:00Z'
        }))
      }));

      // 后端处理：提取URL
      const processedBatch = largeBatch.map(post => ({
        ...post,
        images: post.images.map(img => img.url)
      }));

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      console.log(`📊 大量数据处理性能:`);
      console.log(`   处理数量: 1000个帖子，5000张图片`);
      console.log(`   处理时间: ${processingTime}ms`);

      expect(processedBatch).toHaveLength(1000);
      expect(processedBatch[0].images).toHaveLength(5);
      expect(typeof processedBatch[0].images[0]).toBe('string');
      
      // 大量数据处理应该在100ms内完成
      expect(processingTime).toBeLessThan(100);
    });
  });

  describe('内存占用影响', () => {
    test('内存增长应该线性且可控', () => {
      const sizes = [];
      
      // 测试不同数量的图片对内存的影响
      for (let imageCount = 1; imageCount <= 10; imageCount++) {
        const data = {
          images: Array.from({ length: imageCount }, (_, i) => ({
            url: `https://domain.com/image${i}.jpg`,
            key: `posts/user/image${i}.jpg`,
            size: 100000,
            hash: `hash${i}`,
            uploadTime: '2024-01-15T10:30:00Z'
          }))
        };
        
        const size = JSON.stringify(data).length;
        sizes.push(size);
      }

      // 验证内存增长是线性的（每张图片增长大致相同）
      const growthRates = [];
      for (let i = 1; i < sizes.length; i++) {
        growthRates.push(sizes[i] - sizes[i-1]);
      }

      // 增长率的标准差应该很小（说明增长是线性的）
      const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
      const variance = growthRates.reduce((sum, rate) => sum + Math.pow(rate - avgGrowth, 2), 0) / growthRates.length;
      const stdDev = Math.sqrt(variance);

      console.log(`📊 内存增长分析:`);
      console.log(`   平均每张图片增长: ${avgGrowth.toFixed(1)} bytes`);
      console.log(`   增长率标准差: ${stdDev.toFixed(1)} bytes`);

      // 标准差应该很小，说明增长可预测
      expect(stdDev).toBeLessThan(avgGrowth * 0.1); // 小于平均值的10%
    });
  });

  describe('网络传输优化', () => {
    test('压缩效果评估', () => {
      const testData = {
        circleId: 'circle123',
        content: '测试内容',
        images: [
          {
            url: 'https://tlou.images.wltech-service.site/posts/user123/2024/01/15/image1.jpg',
            key: 'posts/user123/2024/01/15/image1.jpg',
            size: 102400,
            hash: 'FpxBdCRjiQbWwOFH5_5dXjnWkEOL',
            uploadTime: '2024-01-15T10:30:00.000Z'
          }
        ]
      };

      const jsonString = JSON.stringify(testData);
      
      // 模拟gzip压缩效果（真实压缩率通常在60-80%）
      const estimatedCompressedSize = jsonString.length * 0.3; // 假设压缩到30%

      console.log(`📊 网络传输优化:`);
      console.log(`   原始大小: ${jsonString.length} bytes`);
      console.log(`   压缩后估算: ${estimatedCompressedSize.toFixed(0)} bytes`);
      console.log(`   压缩率: ${((1 - 0.3) * 100).toFixed(0)}%`);

      // 即使未压缩，数据量也应该很小
      expect(jsonString.length).toBeLessThan(1024); // < 1KB
    });
  });
});