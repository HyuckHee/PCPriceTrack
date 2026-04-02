import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { Database, DATABASE_TOKEN } from '../../database/database.provider';
import { users, User, SafeUser } from '../../database/schema/users';

const safeUserFields = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  isVerified: users.isVerified,
  provider: users.provider,
  providerId: users.providerId,
  avatarUrl: users.avatarUrl,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

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
      .select(safeUserFields)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async findByProvider(provider: string, providerId: string): Promise<SafeUser | undefined> {
    const result = await this.db
      .select(safeUserFields)
      .from(users)
      .where(and(eq(users.provider, provider), eq(users.providerId, providerId)))
      .limit(1);
    return result[0];
  }

  async createOAuth(data: {
    email: string;
    name?: string;
    provider: string;
    providerId: string;
    avatarUrl?: string;
  }): Promise<SafeUser> {
    const result = await this.db
      .insert(users)
      .values({ ...data, isVerified: true })
      .returning(safeUserFields);
    return result[0];
  }

  async linkProvider(
    id: string,
    provider: string,
    providerId: string,
    avatarUrl?: string,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({ provider, providerId, avatarUrl, isVerified: true, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async create(data: { email: string; passwordHash: string; name?: string }): Promise<SafeUser> {
    const result = await this.db
      .insert(users)
      .values(data)
      .returning(safeUserFields);
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
