import { BaseService } from '@crm-platform/shared-types'
import { User } from '../models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export class AuthService extends BaseService {
  constructor() {
    super(User)
  }

  async findByEmail(email: string) {
    return this.model.findOne({ email })
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 12)
  }

  async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash)
  }

  generateToken(userId: string) {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions)
  }
}
