// components/onboarding-guide/onboarding-guide.js
const navigationHelper = require('../../utils/navigationHelper');

Component({
  properties: {},

  data: {
    headerTop: 0,
    avatarMode: 'dynamic',
    footerVisible: false,
    headerVisible: false,
    postVisible: false,
    hideComments: true,
    demoPost: {
      _id: 'demo',
      author: {
        _id: 'demo-user',
        username: '你',
        avatar: ''
      },
      formattedTime: '刚刚',
      images: [],
      videoUrl: 'https://tlou.images.wltech-service.site/videos/onboarding-vedio-slides.mp4',
      content: '',
      comments: [
        {
          _id: 'c1',
          author: { _id: 'ai', username: 'AI', avatar: '/assets/onboarding/ai-avatar.png', isAI: true },
          content: '',
          aiStatus: '让我看看你发的照片'
        },
        {
          _id: 'c2',
          author: { _id: 'ai', username: 'AI', avatar: '/assets/onboarding/ai-avatar.png', isAI: true },
          content: '每张照片都很漂亮，再拍一张试试？'
        }
      ],
      likes: []
    }
  },

  lifetimes: {
    attached() {
      const menuInfo = wx.getMenuButtonBoundingClientRect();
      this.setData({ headerTop: menuInfo.bottom + 24 });
    },
    ready() {
      setTimeout(() => this._initAvatarCanvases(), 100);
      this._startAnimation();
    },
    detached() {
      this._clearTimers();
    }
  },

  methods: {
    onTakePhoto() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['camera'],
        success: (res) => {
          const tempFile = res.tempFiles[0];
          this.triggerEvent('takePhoto', { tempFilePath: tempFile.tempFilePath });
        }
      });
    },

    onVideoEnded() {
      this.setData({ hideComments: false });
      this._animateDemoComments();

      this._t_aiReply = setTimeout(() => {
        const postItem = this.selectComponent('#demo-post-item');
        if (!postItem) return;
        postItem.transitionAiHeader('c1');
        this._t_startReply = setTimeout(() => postItem.startAiReply('c1', '小时候过年放烟花，又兴奋又怕烫。守岁的时候困得睁不开眼，但就是不肯睡'), 250);
      }, 5000);
    },

    onCommentsDone() {
      this._t_footer = setTimeout(() => this.setData({ footerVisible: true }), 800);
    },

    onToggleAvatarMode() {
      this.setData({ avatarMode: this.data.avatarMode === 'dynamic' ? 'static' : 'dynamic' });
    },

    onTapDemoPost() {},

    _startAnimation() {
      this._clearTimers();
      // 重置动画状态
      this.setData({ headerVisible: false, postVisible: false, hideComments: true, footerVisible: false });
      const postItem = this.selectComponent('#demo-post-item');
      if (postItem) postItem.resetOnboarding();

      // 300ms: header 滑入（给用户准备的时间）
      this._t_header = setTimeout(() => this.setData({ headerVisible: true }), 300);

      // 900ms: post 滑入，滑入完成后 play
      this._t_post = setTimeout(() => {
        this.setData({ postVisible: true });
        this._t_video = setTimeout(() => {
          const pi = this.selectComponent('#demo-post-item');
          if (pi) pi.startOnboardingVideo();
        }, 600);
      }, 900);
    },

    _clearTimers() {
      [this._t_header, this._t_post, this._t_video, this._t_aiReply, this._t_startReply, this._t_footer]
        .forEach(t => clearTimeout(t));
    },

    _animateDemoComments() {
      const postItem = this.selectComponent('#demo-post-item');
      if (postItem) postItem.animateAiComments();
    },

    _initAvatarCanvases() {
      const ids = ['avatar-canvas-1', 'avatar-canvas-2', 'avatar-canvas-3', 'avatar-canvas-4'];
      const fns = [this._drawAvatar1, this._drawAvatar2, this._drawAvatar3, this._drawAvatar4];
      const { pixelRatio } = wx.getSystemInfoSync();
      ids.forEach((id, i) => {
        const query = this.createSelectorQuery();
        query.select(`#${id}`).fields({ node: true, size: true }).exec((res) => {
          if (!res[0] || !res[0].node) return;
          const canvas = res[0].node;
          const cssSize = res[0].width || 40; // px
          const size = Math.round(cssSize * pixelRatio);
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          fns[i].call(this, canvas, ctx, size);
        });
      });
    },

    // 1. 轨道光点 - 黑底，一个亮点绕圆心公转，拖着渐隐尾迹
    _drawAvatar1(canvas, ctx, size) {
      const r = size / 2;
      const orbitR = r * 0.55;
      let t = 0;
      const draw = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, size, size);

        // 尾迹
        const trailLen = 40;
        for (let j = trailLen; j >= 0; j--) {
          const a = (t - j) * 0.04;
          const x = r + Math.cos(a) * orbitR;
          const y = r + Math.sin(a) * orbitR;
          const op = (1 - j / trailLen) * 0.5;
          const dotR = (1 - j / trailLen) * r * 0.12;
          ctx.beginPath();
          ctx.arc(x, y, dotR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,252,245,${op})`;
          ctx.fill();
        }

        // 亮点
        const ax = r + Math.cos(t * 0.04) * orbitR;
        const ay = r + Math.sin(t * 0.04) * orbitR;
        const glow = ctx.createRadialGradient(ax, ay, 0, ax, ay, r * 0.2);
        glow.addColorStop(0, 'rgba(255,255,255,0.95)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, size, size);

        ctx.restore();
        t++;
        canvas.requestAnimationFrame(draw);
      };
      draw();
    },

    // 2. 液态光面 - 黑底，一道弧形高光缓慢上下浮动，像液体表面反光
    _drawAvatar2(canvas, ctx, size) {
      const r = size / 2;
      let t = 0;
      const draw = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, size, size);

        const yOffset = r * 0.3 * Math.sin(t * 0.018);
        const grad = ctx.createLinearGradient(0, r - r * 0.5 + yOffset, 0, r + r * 0.5 + yOffset);
        grad.addColorStop(0, 'rgba(255,252,245,0)');
        grad.addColorStop(0.45, 'rgba(255,252,245,0)');
        grad.addColorStop(0.5, 'rgba(255,252,245,0.22)');
        grad.addColorStop(0.55, 'rgba(255,252,245,0)');
        grad.addColorStop(1, 'rgba(255,252,245,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        ctx.restore();
        t++;
        canvas.requestAnimationFrame(draw);
      };
      draw();
    },

    // 3. 旋转光弧 - 黑底，边缘一段发光弧线旋转
    _drawAvatar3(canvas, ctx, size) {
      const r = size / 2;
      let t = 0;
      const draw = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, size, size);

        const startAngle = t * 0.04;
        const arcLen = Math.PI * 0.6;
        const arcR = r * 0.78;

        // 弧线渐变（用多段小弧模拟）
        const steps = 30;
        for (let j = 0; j < steps; j++) {
          const a = startAngle + (j / steps) * arcLen;
          const op = (j / steps) * 0.9;
          const x = r + Math.cos(a) * arcR;
          const y = r + Math.sin(a) * arcR;
          ctx.beginPath();
          ctx.arc(x, y, r * 0.06, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,252,245,${op})`;
          ctx.fill();
        }

        ctx.restore();
        t++;
        canvas.requestAnimationFrame(draw);
      };
      draw();
    },

    // 4. 蓝紫呼吸核心 - 深黑底，中心蓝紫光球缓慢脉冲，边缘暗
    _drawAvatar4(canvas, ctx, size) {
      const r = size / 2;
      let t = 0;
      const draw = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#060608';
        ctx.fillRect(0, 0, size, size);

        const pulse = 0.5 + Math.sin(t * 0.022) * 0.5;
        const coreR = r * (0.45 + pulse * 0.2);
        const glow = ctx.createRadialGradient(r, r, 0, r, r, coreR);
        glow.addColorStop(0, `rgba(180,160,255,${0.55 * pulse + 0.1})`);
        glow.addColorStop(0.5, `rgba(100,120,255,${0.25 * pulse})`);
        glow.addColorStop(1, 'rgba(60,80,200,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, size, size);

        // 暗角压边
        const vignette = ctx.createRadialGradient(r, r, r * 0.4, r, r, r);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, size, size);

        ctx.restore();
        t++;
        canvas.requestAnimationFrame(draw);
      };
      draw();
    },
  }
});
