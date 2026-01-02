/**
 * Auth Module - Export sve
 */

export {
  generateTokens,
  generateAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  extractTokenFromHeader,
  isTokenExpiringSoon,
  getTokenTimeRemaining,
  type JWTPayload,
  type TokenPair,
  type VerifyResult,
} from './jwt';

export {
  authenticateRequest,
  unauthorizedResponse,
  forbiddenResponse,
  withAuth,
  withTrainerAuth,
  withClientAuth,
  getUserIdFromAuth,
  canAccessResource,
  type AuthResult,
} from './middleware';

