import app from './app.js';

const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  Boolean(process.env.NODE_TEST_CONTEXT) ||
  process.argv.some(arg => arg.includes('test'));

const isServerless = Boolean(
  process.env.VERCEL || process.env.NEXT_RUNTIME || process.env.AWS_LAMBDA_FUNCTION_NAME
);

const initialPort = Number(process.env.PORT || 4000);
if (!isTestEnv && !isServerless) {
  const server = app.listen(initialPort, () => {
    console.log(`[thirdeye-api] server running on port ${initialPort}`);
  });
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[thirdeye-api] Port ${initialPort} in use, trying ${initialPort + 1}...`);
      app.listen(initialPort + 1, () => {
        console.log(`[thirdeye-api] server running on port ${initialPort + 1}`);
      });
    } else {
      console.error(err);
    }
  });
}

export { app };
export default app;
