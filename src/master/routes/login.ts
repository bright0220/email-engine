import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

export const loginRouter = Router();

loginRouter.post('/login', async (req, res) => { // login has basic authentification
  // decode the base64 encoded username and password
  if (!req.headers.authorization) {
    return res.status(401).send('No authorization header');
  }
  const decoded = Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString('utf8');
  const [username, password] = decoded.split(':');
  if (username !== 'alex' || password !== '1234') {
    return res.status(401).send('Invalid username or password');
  }
  // generate a new token
  const accessToken = jwt.sign({ username }, config.JWT_AUTH_SECRET, { expiresIn: '1h' });
  res.json({ accessToken });
});