import nodemailer from 'nodemailer';
import { PASSWORD_EMAILER, USER_EMAILER } from '../config/main.config';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: USER_EMAILER,
    pass: PASSWORD_EMAILER
  }
});

export default transporter;
