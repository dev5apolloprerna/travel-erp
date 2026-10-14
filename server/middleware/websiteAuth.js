import jwt from 'jsonwebtoken';
import WebsiteCustomer from '../models/WebsiteCustomer.js';

// Auth guard for the public website-customer APIs (v39). Separate from the ERP `protect`
// middleware: it validates a website-customer JWT and loads req.websiteCustomer.
export const protectWebsiteCustomer = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.kind !== 'websitecustomer') return res.status(401).json({ message: 'Invalid token' });
    const customer = await WebsiteCustomer.findById(decoded.id);
    if (!customer || !customer.isActive) return res.status(401).json({ message: 'Account not found or inactive' });
    req.websiteCustomer = customer;
    next();
  } catch {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const signWebsiteToken = (customer) =>
  jwt.sign({ id: customer._id, kind: 'websitecustomer' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
