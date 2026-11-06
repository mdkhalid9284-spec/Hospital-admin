import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validator.js';
import {
  registerSchema,
  patientSignupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema.js';
import { authIpRateLimiter } from '../middlewares/rateLimiter.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { revokedTokens } from '../middlewares/auth.middleware.js';

const router = Router();

router.post(
  '/register',
  authIpRateLimiter,
  validateRequest({ body: registerSchema }),
  AuthController.register
);

/**
 * Patient portal self-registration. Links an existing hospital medical record
 * to a new login; it never creates a duplicate patient profile.
 */
router.post(
  '/patient-signup',
  authIpRateLimiter,
  validateRequest({ body: patientSignupSchema }),
  AuthController.patientSignup
);

router.post(
  '/login',
  authIpRateLimiter,
  validateRequest({ body: loginSchema }),
  AuthController.login
);

router.post(
  '/forgot-password',
  authIpRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  authIpRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  AuthController.resetPassword
);

router.get('/me', authenticateToken, AuthController.me);

/**
 * Server-side logout: revokes the presented access token so it can no longer
 * be used to call protected endpoints. The client must still clear localStorage.
 */
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
