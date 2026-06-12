import app from "./app";
import { env } from "./config/env";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`[SessionGuard API] Server running on http://localhost:${PORT}`);
  console.log(`[SessionGuard API] Environment: ${env.NODE_ENV}`);
});
