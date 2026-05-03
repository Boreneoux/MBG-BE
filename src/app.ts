import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import passport from 'passport';

import { errorMiddleware } from './middlewares/error.middleware';
import { corsOptions } from './config/cors.config';
import { PORT, SESSION_SECRET, DATABASE_URL } from './config/main.config';
import authRouter from './routes/auth.router';
import userRouter from './routes/user.router';
import categoryRouter from './routes/category.router';
import productRouter from './routes/product.router';
import cartRouter from './routes/cart.router';
import storeRouter from './routes/store.router';
import orderRouter from './routes/order.router';
import shippingRouter from './routes/shipping.router';
import inventoryRouter from './routes/inventory.router';
import discountRouter from './routes/discount.router';
import voucherRouter from './routes/voucher.router';
import adminOrderRouter from './routes/admin.order.router';
import regionRouter from './routes/region.router';
import mutationRouter from './routes/mutation.router';
import reportRouter from './routes/report.router';
import schedulerRouter from './routes/scheduler.router';
import { startSchedulerJob } from './jobs/scheduler.job';

const serverPort = PORT || 8000;
const PgStore = connectPg(session);
const app: Express = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    store: new PgStore({
      conString: DATABASE_URL,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
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
app.use('/api/users', userRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/stores', storeRouter);
app.use('/api/orders', orderRouter);
app.use('/api/admin/orders', adminOrderRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/discounts', discountRouter);
app.use('/api/vouchers', voucherRouter);
app.use('/api/regions', regionRouter);
app.use('/api/mutations', mutationRouter);
app.use('/api/reports', reportRouter);
app.use('/api/internal/scheduler', schedulerRouter);

// Centralized Error Handler
app.use(errorMiddleware);

// Local dev only — Vercel serverless uses the exported app, not app.listen()
if (process.env.NODE_ENV !== 'production') {
  startSchedulerJob();
  app.listen(serverPort, () => {
    console.log(
      `⚡️[server]: Server is running at http://localhost:${serverPort}`
    );
  });
}

export default app;
