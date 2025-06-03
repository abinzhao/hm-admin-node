const { exec } = require('child_process');

// 检查端口是否被占用并杀掉进程
function checkAndKillPort(port) {
  return new Promise((resolve) => {
    // 查找占用端口的进程
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (stdout) {
        const pid = stdout.trim();
        console.log(`端口 ${port} 被进程 ${pid} 占用，正在终止...`);
        
        // 杀掉进程
        exec(`kill -9 ${pid}`, (killError) => {
          if (killError) {
            console.log(`无法终止进程 ${pid}:`, killError.message);
          } else {
            console.log(`成功终止进程 ${pid}`);
          }
          
          // 等待一秒后继续
          setTimeout(() => {
            resolve();
          }, 1000);
        });
      } else {
        console.log(`端口 ${port} 未被占用`);
        resolve();
      }
    });
  });
}

module.exports = { checkAndKillPort };
