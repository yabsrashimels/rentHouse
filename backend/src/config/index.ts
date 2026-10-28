import dotenv from 'dotenv';
dotenv.config();

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)
) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in production.');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'ethiorent-dev-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'ethiorent-refresh-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Email
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@ethiorent.com',
  },
  
  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  
  // Cookies
  cookieSecure: process.env.NODE_ENV === 'production',
  cookieSameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
  cookieDomain: process.env.COOKIE_DOMAIN || '',
  
  // Admin
  adminEmail: process.env.ADMIN_EMAIL || 'admin@ethiorent.com',
};

export default config;
