import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';

import { errorMiddleware } from './middlewares/error.middleware';
import { corsOptions } from './config/cors.config';
import { PORT, SESSION_SECRET } from './config/main.config';
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
import { schedulerService } from './services/scheduler.service';

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

// Centralized Error Handler
app.use(errorMiddleware);

app.listen(serverPort, () => {
  console.log(
    `⚡️[server]: Server is running at http://localhost:${serverPort}`
  );

  // Start the scheduler
  schedulerService.start();
});
