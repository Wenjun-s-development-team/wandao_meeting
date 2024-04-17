export const config = {
  port: 8686,
  https: false,
  host: 'localhost',

  cors: { origin: '*', methods: ['GET', 'POST'] },

  ip_whitelist_enabled: false,
  ip_whitelist_allowed: ['127.0.0.1', '::1'],

  userAuth: false, // 用户是否需要认证
  protected: false, // 是否需要 users 中有效用户名和密码
  users: [{ username: 'admin', password: 'admin' }],

  JWT_KEY: 'wdmeeting_jwt_secret',
  JWT_EXP: '1h',

  // 主持人列表
  roomPresenters: ['admin'],

  // stun / turn 服务设置
  iceCandidate_servers: [
    {
      // 非内部网络必须提供 Stun
      type: 'stun',
      urls: 'stun:turn.idreamsky.net:5349',
      enabled: true,
    },
    {
      type: 'turn',
      urls: 'turn:turn.idreamsky.net:5349',
      username: 'dreamsky',
      credential: 'ilovewandao',
      enabled: true,
    },
    {
      type: 'turn',
      urls: 'turn:47.116.117.67:5349',
      username: 'admin',
      credential: '123456',
      enabled: false,
    },
  ],
}
