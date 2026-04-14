import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';

import { errorMiddleware } from './middlewares/error.middleware';
import { corsOptions } from './config/cors.config';
import { PORT, SESSION_SECRET } from './config/main.config';
import authRouter from './routes/auth.router';
import cartRouter from './routes/cart.router';
import storeRouter from './routes/store.router';
import orderRouter from './routes/order.router';

const serverPort = PORT || 8000;
const app: Express = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 5 * 60 * 1000
    }
  })
);
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/cart', cartRouter);
app.use('/api/stores', storeRouter);
app.use('/api/orders', orderRouter);

// Centralized Error Handler
app.use(errorMiddleware);

app.listen(serverPort, () => {
  console.log(
    `⚡️[server]: Server is running at http://localhost:${serverPort}`
  );
});
