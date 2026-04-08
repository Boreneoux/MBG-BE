import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { errorMiddleware } from './middlewares/error.middleware';

import { corsOptions } from './config/cors.config';
import { PORT } from './config/main.config';

const serverPort = PORT || 8000;
const app: Express = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
// Routes

// Centralized Error Handler
app.use(errorMiddleware);

app.listen(serverPort, () => {
  console.log(
    `⚡️[server]: Server is running at http://localhost:${serverPort}`
  );
});
