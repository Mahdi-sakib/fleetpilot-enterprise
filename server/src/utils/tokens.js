import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

export const verifyAccessToken = (token) => jwt.verify(token, config.jwtSecret);
