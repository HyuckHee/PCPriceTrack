import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, lte } from 'drizzle-orm';
import { DATABASE_TOKEN, Database } from '../../../database/database.provider';
import {
  alerts,
  notifications,
  priceRecords,
  productListings,
} from '../../../database/schema';
import { ScrapeResult } from '../interfaces/adapter.interface';
import { MAX_LISTING_FAILURES } from '../constants';

interface IngestionSummary {
  listingId: string;
  priceRecorded: boolean;
  priceChanged: boolean;
  alertsTriggered: number;
}

@Injectable()
export class PriceIngestionService {
  private readonly logger = new Logger(PriceIngestionService.name);

  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  /**
   * Persist a successful scrape result:
   *  1. Determine if price changed vs last record (skip duplicate inserts)
   *  2. Insert price_record
   *  3. Update listing.lastSeenAt + reset failureCount
   *  4. Evaluate all active alerts for this product
   */
  async ingest(listingId: string, result: ScrapeResult): Promise<IngestionSummary> {
    const summary: IngestionSummary = {
      listingId,
      priceRecorded: false,
      priceChanged: false,
      alertsTriggered: 0,
    };

    // ── 1. Fetch last recorded price ───────────────────────────────────────
    const [lastRecord] = await this.db
      .select({ price: priceRecords.price, inStock: priceRecords.inStock })
      .from(priceRecords)
      .where(eq(priceRecords.listingId, listingId))
      .orderBy(desc(priceRecords.recordedAt))
      .limit(1);

    const newPrice = String(result.price.toFixed(2));
    const priceChanged =
      !lastRecord ||
      lastRecord.price !== newPrice ||
      lastRecord.inStock !== result.inStock;

    // ── 2. Insert price record (always on first seen; otherwise only on change) ──
    if (priceChanged) {
      await this.db.insert(priceRecords).values({
        listingId,
        price: newPrice,
        originalPrice: result.originalPrice ? String(result.originalPrice.toFixed(2)) : undefined,
        currency: result.currency,
        inStock: result.inStock,
        recordedAt: result.scrapedAt,
      });
      summary.priceRecorded = true;
      summary.priceChanged = true;
      this.logger.debug(
        `Price recorded for listing ${listingId}: $${newPrice} (was ${lastRecord?.price ?? 'N/A'})`,
      );
    }

    // ── 3. Update listing metadata ─────────────────────────────────────────
    await this.db
      .update(productListings)
      .set({
        lastSeenAt: result.scrapedAt,
        failureCount: '0',
        updatedAt: new Date(),
      })
      .where(eq(productListings.id, listingId));

    // ── 4. Evaluate alerts (only if price dropped) ─────────────────────────
    if (priceChanged && result.inStock) {
      summary.alertsTriggered = await this.evaluateAlerts(listingId, result.price);
    }

    return summary;
  }

  /**
   * Increment failure count for a listing.
   * Deactivates the listing after MAX_LISTING_FAILURES consecutive failures.
   */
  async recordFailure(listingId: string, reason: string): Promise<void> {
    const [listing] = await this.db
      .select({ failureCount: productListings.failureCount, isActive: productListings.isActive })
      .from(productListings)
      .where(eq(productListings.id, listingId))
      .limit(1);

    if (!listing) return;

    const newCount = parseInt(listing.failureCount, 10) + 1;
    const shouldDeactivate = newCount >= MAX_LISTING_FAILURES;

    await this.db
      .update(productListings)
      .set({
        failureCount: String(newCount),
        isActive: shouldDeactivate ? false : listing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(productListings.id, listingId));

    if (shouldDeactivate) {
      this.logger.warn(
        `Listing ${listingId} deactivated after ${newCount} consecutive failures. Reason: ${reason}`,
      );
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Find all active alerts for the product linked to this listing,
   * where the new price is at or below the alert target.
   * Queues email notifications for each match.
   */
  private async evaluateAlerts(listingId: string, newPrice: number): Promise<number> {
    // Get the productId for this listing
    const [listing] = await this.db
      .select({ productId: productListings.productId })
      .from(productListings)
      .where(eq(productListings.id, listingId))
      .limit(1);

    if (!listing) return 0;

    // Find active alerts where target price >= new price
    const triggeredAlerts = await this.db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.productId, listing.productId),
          eq(alerts.isActive, true),
          lte(alerts.targetPrice, String(newPrice)),
        ),
      );

    if (triggeredAlerts.length === 0) return 0;

    const now = new Date();

    for (const alert of triggeredAlerts) {
      // Create a pending notification — the notification worker sends the email
      await this.db.insert(notifications).values({
        userId: alert.userId,
        alertId: alert.id,
        channel: 'email',
        status: 'pending',
        payload: {
          productId: listing.productId,
          listingId,
          triggeredPrice: newPrice,
          targetPrice: alert.targetPrice,
          triggeredAt: now.toISOString(),
        },
      });

      // Mark alert as triggered (keeps it active — users may want repeated alerts)
      await this.db
        .update(alerts)
        .set({ triggeredAt: now, updatedAt: now })
        .where(eq(alerts.id, alert.id));

      this.logger.log(
        `Alert triggered: user=${alert.userId} product=${listing.productId} price=$${newPrice} <= target=$${alert.targetPrice}`,
      );
    }

    return triggeredAlerts.length;
  }
}
