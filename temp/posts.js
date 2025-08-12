const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Post = require('../models/Post');
const Circle = require('../models/Circle');
const { checkOpenid } = require('../middleware/openidAuth');
const { catchAsync, AppError, globalErrorHandler } = require('../utils/errorHandler');
const User = require('../models/User'); // Added for comments
const mongoose = require('mongoose'); // Added for mongoose.Types.ObjectId
const qiniu = require('qiniu'); // 🆕 添加这行
const { updateCircleActivity } = require('../utils/circleUtils'); // 添加朋友圈活动更新工具

const router = express.Router();

// 🆕 添加这个简单的删除函数
async function deleteQiniuFiles(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return;
  
  // 从环境变量获取密钥（如果没有就跳过删除）
  const accessKey = process.env.QINIU_ACCESS_KEY;
  const secretKey = process.env.QINIU_SECRET_KEY;
  
  if (!accessKey || !secretKey) {
    console.warn('⚠️ 七牛云密钥未配置，跳过文件删除');
    return;
  }

  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  const bucketManager = new qiniu.rs.BucketManager(mac);
  const bucket = 'tlou';

  for (const url of imageUrls) {
    try {
      // 从URL提取key: https://domain.com/path/file.jpg -> path/file.jpg
      const key = new URL(url).pathname.substring(1);
      
      bucketManager.delete(bucket, key, (err, respBody, respInfo) => {
        if (err) {
          console.error('❌ 文件删除失败:', key, err);
        } else if (respInfo.statusCode === 200) {
          console.log('✅ 文件删除成功:', key);
        }
      });
    } catch (error) {
      console.warn('⚠️ URL解析失败:', url);
    }
  }
}

// 创建帖子
router.post('/', checkOpenid, [
  body('circleId')
    .notEmpty()
    .withMessage('朋友圈ID不能为空')
    .isMongoId()
    .withMessage('无效的朋友圈ID'),
  body('content')
    .optional()
    .isString()
    .withMessage('内容必须是字符串'),
  body('images')
    .optional()
    .isArray()
    .withMessage('图片必须是数组格式')
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('输入验证失败: ' + errors.array().map(e => e.msg).join(', '), 400);
  }

  const { circleId, content, images } = req.body;

  // 🆕 添加这几行：兼容前端新格式，但仍然只存储URL
  const imageUrls = images ? images.map(img => {
    if (typeof img === 'string') {
      return img; // 旧格式：直接是URL
    }
    return img.url; // 新格式：提取URL
  }) : [];

  // 检查朋友圈是否存在
  const circle = await Circle.findById(circleId);
  if (!circle) {
    throw new AppError('朋友圈不存在', 404);
  }

  // 检查用户是否是朋友圈成员
  if (!circle.isMember(req.user._id)) {
    throw new AppError('您不是此朋友圈的成员', 403);
  }

  const post = await Post.create({
    author: req.user._id,
    circle: circleId,
    content,
    images: imageUrls  // 仍然存储URL数组
  });

  // 填充作者信息
  await post.populate('author', 'username avatar');

  // 更新朋友圈活动时间
  updateCircleActivity(circleId);

  res.status(201).json({
    success: true,
    message: '发布成功',
    data: { post }
  });
}));

// 获取朋友圈的帖子列表（批量查询优化版本）
router.get('/', checkOpenid, [
  query('circleId')
    .notEmpty()
    .withMessage('朋友圈ID不能为空')
    .isMongoId()
    .withMessage('无效的朋友圈ID')
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('输入验证失败: ' + errors.array().map(e => e.msg).join(', '), 400);
  }

  const { circleId } = req.query;

  // 检查朋友圈是否存在且用户有权限访问
  const circle = await Circle.findById(circleId);
  if (!circle) {
    throw new AppError('朋友圈不存在', 404);
  }

  // 权限检查：公开朋友圈所有人都能看，私密朋友圈只有creator、member、invitee能看（applier不能看）
  if (!circle.isPublic && !(circle.isCreator(req.user._id) || circle.isMember(req.user._id) || circle.isInvitee(req.user._id))) {
    throw new AppError('无权查看此朋友圈的帖子', 403);
  }

  // 获取该朋友圈的所有帖子（同时填充点赞用户信息）
  const posts = await Post.find({ circle: circleId })
    .populate('author', 'username avatar')
    .populate('likes', 'username avatar') // 🆕 添加点赞用户信息填充
    .sort({ createdAt: -1 });

  // 收集所有需要的用户ID（用于评论）
  const userIds = new Set();
  posts.forEach(post => {
    post.comments.forEach(comment => {
      userIds.add(comment.author.toString());
      if (comment.replyTo) {
        userIds.add(comment.replyTo.toString());
      }
    });
  });

  // 批量查询所有用户信息（只需要1次查询）
  const users = await User.find(
    { _id: { $in: Array.from(userIds) } }, 
    'username avatar'
  );
  
  // 创建用户信息映射表
  const userMap = new Map(users.map(user => [user._id.toString(), user]));

  // 填充用户信息
  const postsWithPopulatedComments = posts.map(post => {
    const postObj = post.toObject();
    
    // 🆕 添加 likedUsers 字段，保持向后兼容
    postObj.likedUsers = postObj.likes || [];
    
    if (postObj.comments && postObj.comments.length > 0) {
      postObj.comments = postObj.comments.map(comment => ({
        ...comment,
        author: userMap.get(comment.author.toString()) || {
          _id: comment.author,
          username: '未知用户',
          avatar: ''
        },
        replyTo: comment.replyTo ? {
          _id: comment.replyTo,
          username: userMap.get(comment.replyTo.toString())?.username || '未知用户'
        } : null
      }));
    }
    
    return postObj;
  });

  res.json({
    success: true,
    data: { posts: postsWithPopulatedComments }
  });
}));

// 点赞/取消点赞（优化版本）
router.post('/:id/like', checkOpenid, catchAsync(async (req, res) => {
  const postId = req.params.id;
  const userId = req.user._id;

  // 先检查帖子是否存在并获取当前点赞状态
  const post = await Post.findById(postId, 'likes');
  if (!post) {
    throw new AppError('帖子不存在', 404);
  }

  const isLiked = post.likes.some(id => id.toString() === userId.toString());

  // 根据当前状态执行相反操作
  if (isLiked) {
    // 取消点赞
    await Post.findByIdAndUpdate(postId, {
      $pull: { likes: userId }
    });
  } else {
    // 点赞
    await Post.findByIdAndUpdate(postId, {
      $addToSet: { likes: userId }
    });
    
    // 只在点赞时更新朋友圈活动时间（取消点赞不更新）
    const postWithCircle = await Post.findById(postId, 'circle');
    if (postWithCircle) {
      updateCircleActivity(postWithCircle.circle);
    }
  }

  // 🆕 获取更新后的完整点赞用户信息
  const updatedPost = await Post.findById(postId, 'likes')
    .populate('likes', 'username avatar');

  res.json({
    success: true,
    message: isLiked ? '取消点赞成功' : '点赞成功',
    data: { 
      liked: !isLiked,
      likedUsers: updatedPost.likes // 🆕 返回完整的点赞用户信息
    }
  });
}));

// 删除帖子（优化版本）
router.delete('/:id', checkOpenid, catchAsync(async (req, res) => {
  const postId = req.params.id;
  const userId = req.user._id;

  // 🆕 添加这段：先查询获取图片URLs
  const post = await Post.findOne({
    _id: postId,
    author: userId
  });

  if (!post) {
    throw new AppError('帖子不存在或无权限删除', 404);
  }

  // 🆕 添加这行：异步删除七牛云文件
  if (post.images && post.images.length > 0) {
    setImmediate(() => deleteQiniuFiles(post.images));
  }

  // 原有删除逻辑不变
  await Post.findByIdAndDelete(postId);

  res.json({
    success: true,
    message: '帖子删除成功'
  });
}));

// 添加评论
router.post('/:id/comments', checkOpenid, [
  body('content')
    .notEmpty()
    .withMessage('评论内容不能为空')
    .isLength({ max: 500 })
    .withMessage('评论内容不能超过500字'),
  body('replyToUserId')
    .optional()
    .isMongoId()
    .withMessage('无效的回复用户ID')
], catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('输入验证失败: ' + errors.array().map(e => e.msg).join(', '), 400);
  }

  const postId = req.params.id;
  const { content, replyToUserId } = req.body;
  const userId = req.user._id;

  // 检查帖子是否存在
  const post = await Post.findById(postId);
  if (!post) {
    throw new AppError('帖子不存在', 404);
  }

  // 如果是回复用户，检查用户是否存在
  if (replyToUserId) {
    const replyToUser = await User.findById(replyToUserId, 'username');
    if (!replyToUser) {
      throw new AppError('回复的用户不存在', 404);
    }
  }

  // 创建新评论对象
  const newComment = {
    _id: new mongoose.Types.ObjectId(),
    author: userId,
    content,
    replyTo: replyToUserId || null,
    createdAt: new Date()
  };

  // 使用原子操作添加评论
  await Post.updateOne(
    { _id: postId },
    { $push: { comments: newComment } }
  );

  // 更新朋友圈活动时间
  updateCircleActivity(post.circle);

  res.status(201).json({
    success: true,
    message: '评论成功'
  });
}));

// 删除评论
router.delete('/:postId/comments/:commentId', checkOpenid, catchAsync(async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.user._id;

  // 检查帖子是否存在
  const post = await Post.findById(postId);
  if (!post) {
    throw new AppError('帖子不存在', 404);
  }

  // 查找要删除的评论
  const comment = post.comments.id(commentId);
  if (!comment) {
    throw new AppError('评论不存在', 404);
  }

  // 检查权限：只能删除自己的评论
  if (comment.author.toString() !== userId.toString()) {
    throw new AppError('无权删除此评论', 403);
  }

  // 删除评论
  await Post.updateOne(
    { _id: postId },
    { $pull: { comments: { _id: commentId } } }
  );

  res.json({
    success: true,
    message: '评论删除成功'
  });
}));

module.exports = router; 