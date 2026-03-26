import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { and, eq, desc } from 'drizzle-orm';
import { Database, DATABASE_TOKEN } from '../../database/database.provider';
import { alerts } from '../../database/schema/alerts';
import { products } from '../../database/schema/products';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async create(userId: string, dto: CreateAlertDto) {
    const product = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, dto.productId))
      .limit(1);
    if (!product[0]) throw new NotFoundException('Product not found');

    const [alert] = await this.db
      .insert(alerts)
      .values({
        userId,
        productId: dto.productId,
        targetPrice: String(dto.targetPrice),
      })
      .returning();

    return alert;
  }

  async findAll(userId: string) {
    return this.db
      .select({
        id: alerts.id,
        targetPrice: alerts.targetPrice,
        isActive: alerts.isActive,
        triggeredAt: alerts.triggeredAt,
        createdAt: alerts.createdAt,
        product: {
          id: products.id,
          name: products.name,
          slug: products.slug,
          imageUrl: products.imageUrl,
        },
      })
      .from(alerts)
      .innerJoin(products, eq(alerts.productId, products.id))
      .where(eq(alerts.userId, userId))
      .orderBy(desc(alerts.createdAt));
  }

  async remove(userId: string, alertId: string) {
    const [alert] = await this.db
      .select()
      .from(alerts)
      .where(eq(alerts.id, alertId))
      .limit(1);

    if (!alert) throw new NotFoundException('Alert not found');
    if (alert.userId !== userId) throw new ForbiddenException();

    await this.db.delete(alerts).where(eq(alerts.id, alertId));
  }

  async deactivate(userId: string, alertId: string) {
    const [alert] = await this.db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)))
      .limit(1);

    if (!alert) throw new NotFoundException('Alert not found');

    const [updated] = await this.db
      .update(alerts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(alerts.id, alertId))
      .returning();

    return updated;
  }
}
