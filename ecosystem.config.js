module.exports = {
  apps: [
    {
      name: "hm-admin-node",
      script: "app.js",
      cwd: "/var/node-service-app/hm-admin-node",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/pm2/hm-admin-node-error.log",
      out_file: "/var/log/pm2/hm-admin-node-out.log",
      log_file: "/var/log/pm2/hm-admin-node-combined.log",
      time: true,
    },
  ],
};
