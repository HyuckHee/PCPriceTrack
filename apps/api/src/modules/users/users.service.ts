import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, DATABASE_TOKEN } from '../../database/database.provider';
import { users, User, SafeUser } from '../../database/schema/users';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0];
  }

  async findById(id: string): Promise<SafeUser | undefined> {
    const result = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async create(data: { email: string; passwordHash: string; name?: string }): Promise<SafeUser> {
    const result = await this.db
      .insert(users)
      .values(data)
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });
    return result[0];
  }

  async updateRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    await this.db
      .update(users)
      .set({ refreshTokenHash: hash, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async findByIdWithRefreshToken(id: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }
}
