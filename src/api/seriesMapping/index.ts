import { ISeriesMapping, SourcePlatform } from "@/types/integrations/seriesMapping";
import eventbus from "@/api/eventbus";
import logger from "@/config/logger";
import { getDateFromNow } from "@/utils";
import db from "@/db";

// Events for series mapping
export const SERIES_MAPPING_ADDED = "SERIES_MAPPING_ADDED";
export const SERIES_MAPPING_UPDATED = "SERIES_MAPPING_UPDATED";
export const SERIES_MAPPING_REMOVED = "SERIES_MAPPING_REMOVED";

// 1 minute TTL for mappings (for testing - change to 365 for production)
const MAPPING_TTL_DAYS = 365;

// Additional data interface for findMapping method
export interface IMappingAdditionalData {
  malSeriesId?: number;
  totalEpisodes?: number;
  coverImage?: string;
  backgroundCoverImage?: string;
  bannerImage?: string;
  description?: string;
}

// Mapping statistics interface
export interface IMappingStats {
  totalMappings: number;
  platformCounts: Record<string, number>;
  expiredCount: number;
  recentCount: number;
}

/**
 * Series Mapping Storage API
 * Handles persistent storage of series mappings using IndexedDB
 * Always writes mappings to provide editing capabilities even for single matches
 */
class SeriesMappingStorage {
  /**
   * Get all series mappings
   */
  async getAllMappings(): Promise<ISeriesMapping[]> {
    try {
      return await db.getAllSeriesMappings();
    } catch (error) {
      logger.error("Error getting series mappings");
      return [];
    }
  }

  /**
   * Find mapping by series title and source platform
   * Always creates a mapping if exact match is found but no mapping exists
   */
  async findMapping(
    seriesTitle: string,
    sourcePlatform: SourcePlatform,
    seasonYear?: number,
    anilistSeriesId?: number,
    forceCreate = true,
    additionalData?: IMappingAdditionalData
  ): Promise<ISeriesMapping | undefined> {
    const normalizedTitle = this.normalizeTitle(seriesTitle);
    logger.info(`findMapping: "${seriesTitle}" normalized to "${normalizedTitle}" (platform: ${sourcePlatform}, year: ${seasonYear})`);

    try {
      // Try to find existing mapping
      const existingMapping = await db.findSeriesMappingByTitle(normalizedTitle, sourcePlatform, seasonYear);

      if (existingMapping) {
        // Extend TTL since it's being used
        await this.extendMappingTTL(existingMapping.id);
        return existingMapping;
      }

      // If no mapping exists but we have an AniList series ID and forceCreate is true,
      // automatically create a mapping for future editing
      if (forceCreate && anilistSeriesId) {
        logger.info(`Auto-creating series mapping for future editing: ${seriesTitle} -> ${anilistSeriesId}`);

        const newMapping = await this.createMapping({
          series_title: seriesTitle,
          source_platform: sourcePlatform,
          season_year: seasonYear,
          anilist_series_id: anilistSeriesId,
          mal_series_id: additionalData?.malSeriesId,
          total_episodes: additionalData?.totalEpisodes,
          cover_image: additionalData?.coverImage,
          background_cover_image: additionalData?.backgroundCoverImage,
          banner_image: additionalData?.bannerImage,
          series_description: additionalData?.description,
          user_confirmed: true, // Auto-confirmed for exact matches
        });

        return newMapping;
      }

      return undefined;
    } catch (error) {
      logger.error("Error finding series mapping");
      return undefined;
    } finally {
      // Cleanup expired mappings after the operation
      this.cleanupExpiredMappings().catch(() => {
        // Ignore cleanup errors to not affect main operation
      });
    }
  }

  /**
   * Create a new series mapping
   * Always writes to provide editing capabilities
   */
  async createMapping(
    mapping: Omit<ISeriesMapping, "id" | "created_at" | "updated_at" | "expires_at" | "normalized_title">
  ): Promise<ISeriesMapping> {
    const now = Date.now();
    const expiresAt = getDateFromNow(MAPPING_TTL_DAYS, "FUTURE").getTime();

    const newMapping: ISeriesMapping = {
      ...mapping,
      id: self.crypto.randomUUID(),
      normalized_title: this.normalizeTitle(mapping.series_title),
      created_at: now,
      updated_at: now,
      expires_at: expiresAt,
    };

    try {
      await db.addSeriesMapping(newMapping);
      eventbus.publish(SERIES_MAPPING_ADDED, { message: "Series mapping created", value: newMapping });
      logger.info(`Created series mapping: ${mapping.series_title} -> AniList ID: ${mapping.anilist_series_id}`);
      return newMapping;
    } catch (error) {
      logger.error("Error creating series mapping");
      throw error;
    }
  }

  /**
   * Update an existing series mapping
   */
  async updateMapping(id: string, updates: Partial<Omit<ISeriesMapping, "id" | "created_at">>): Promise<ISeriesMapping | undefined> {
    try {
      const existingMapping = await db.getSeriesMappingById(id);
      if (!existingMapping) {
        logger.warn(`Series mapping not found for update: ${id}`);
        return undefined;
      }

      const updatedMapping: ISeriesMapping = {
        ...existingMapping,
        ...updates,
        updated_at: Date.now(),
        normalized_title: updates.series_title ? this.normalizeTitle(updates.series_title) : existingMapping.normalized_title,
      };

      await db.updateSeriesMapping(updatedMapping);
      eventbus.publish(SERIES_MAPPING_UPDATED, { message: "Series mapping updated", value: updatedMapping });
      logger.info(`Updated series mapping: ${updatedMapping.series_title}`);

      return updatedMapping;
    } catch (error) {
      logger.error("Error updating series mapping");
      return undefined;
    }
  }

  /**
   * Remove a series mapping
   */
  async removeMapping(id: string): Promise<boolean> {
    try {
      const existingMapping = await db.getSeriesMappingById(id);
      if (!existingMapping) {
        logger.warn(`Series mapping not found for removal: ${id}`);
        return false;
      }

      await db.deleteSeriesMapping(id);
      eventbus.publish(SERIES_MAPPING_REMOVED, { message: "Series mapping removed", value: existingMapping });
      logger.info(`Removed series mapping: ${existingMapping.series_title}`);

      return true;
    } catch (error) {
      logger.error("Error removing series mapping");
      return false;
    }
  }

  /**
   * Get mappings for a specific source platform
   */
  async getMappingsByPlatform(sourcePlatform: SourcePlatform): Promise<ISeriesMapping[]> {
    try {
      return await db.getSeriesMappingsByPlatform(sourcePlatform);
    } catch (error) {
      logger.error("Error getting mappings by platform");
      return [];
    }
  }

  /**
   * Normalize title for consistent matching
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove special characters
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Extend TTL for a mapping (e.g., when it's used successfully)
   */
  async extendMappingTTL(id: string): Promise<void> {
    const newExpiresAt = getDateFromNow(MAPPING_TTL_DAYS, "FUTURE").getTime();
    await this.updateMapping(id, { expires_at: newExpiresAt });
  }

  /**
   * Cleanup expired mappings
   * Simple approach: get all mappings, check expiry, delete if needed
   */
  async cleanupExpiredMappings(): Promise<number> {
    try {
      const allMappings = await db.getAllSeriesMappings();
      const now = Date.now();
      let deletedCount = 0;

      for (const mapping of allMappings) {
        if (mapping.expires_at <= now) {
          await db.deleteSeriesMapping(mapping.id);
          eventbus.publish(SERIES_MAPPING_REMOVED, { message: "Expired series mapping removed", value: mapping });
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired series mappings`);
      }
      return deletedCount;
    } catch (error) {
      logger.error(`Error cleaning up expired mappings: ${error}`);
      return 0;
    }
  }
}

// Export singleton instance
export const seriesMappingStorage = new SeriesMappingStorage();
