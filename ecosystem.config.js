module.exports = {
  apps: [
    {
      name: "storo-id",
      cwd: "/var/www/html/storo-id-landingpage",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/pm2/storo-id-error.log",
      out_file: "/var/log/pm2/storo-id-out.log",
      time: true,
    },
  ],
};
