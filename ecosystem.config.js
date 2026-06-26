module.exports = {
  apps: [
    {
      name: 'tienda-gloss-api',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'tienda-gloss-tunnel',
      script: 'C:\\Users\\Administrador\\Desktop\\dato.click\\ngrok.exe',
      args: 'http 3001',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
    }
  ]
};
