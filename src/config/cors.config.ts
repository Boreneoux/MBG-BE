const whiteList = ['http://localhost:3000'];

export const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (!origin) return callback(null, true); // for development

    if (whiteList.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
};
