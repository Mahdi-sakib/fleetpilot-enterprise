import { randomUUID, randomInt, randomBytes } from 'node:crypto';

export const newId = () => randomUUID();

export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export const newToken = () => randomBytes(32).toString('hex');
