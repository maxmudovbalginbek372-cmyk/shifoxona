// pm2 sozlamasi: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'medcare-api',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      HOST: '127.0.0.1',            // faqat nginx orqali kiriladi
      JWT_SECRET: 'BU_YERGA_UZUN_TASODIFIY_SATR_YOZING',
      CORS_ORIGIN: '',              // masalan: https://medcare.netlify.app (proxy ishlatsangiz bo'sh qoldiring)
    },
  }],
};
