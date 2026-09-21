import app from './app';
import { config } from './config/env';

const server = app.listen(config.port, () => {
  console.log(`=========================================`);
  console.log(`🚀 Stock Opname API Server is running!`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`📚 Swagger Docs: http://localhost:${config.port}/api-docs`);
  console.log(`=========================================`);
});

export default server;
