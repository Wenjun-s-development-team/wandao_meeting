export const config = {
  host: 'localhost',
  port: 8081,
  https: false,

  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },

  ip_whitelist_enabled: false,
  ip_whitelist_allowed: ['127.0.0.1', '::1'],

  userAuth: false, // 用户是否需要认证
  protected: false, // 是否需要 users 中有效用户名和密码
  users: [{ username: 'admin', password: 'admin' }],

  JWT_KEY: 'wdmeeting_jwt_secret',
  JWT_EXP: '1h',

  // 演示者列表
  roomPresenters: ['admin'],

  // stun 服务
  stun_server_enabled: true,
  stun_server_url: 'stun:stun.l.google.com:19302',
  // turn 服务
  turn_server_enabled: true,
  turn_server_url: 'turn:a.relay.metered.ca:443',
  turn_server_username: 'e8dd65b92c62d3e36cafb807',
  turn_server_credential: 'uWdWNmkhvyqTEswO',
}
