import { ISeriesMapping, SourcePlatform } from "@/types/integrations/seriesMapping";
import eventbus from "@/api/eventbus";
import logger from "@/config/logger";
import { getDateFromNow } from "@/utils";
import db from "@/db";

// Events for series mapping
export const SERIES_MAPPING_ADDED = "SERIES_MAPPING_ADDED";
export const SERIES_MAPPING_UPDATED = "SERIES_MAPPING_UPDATED";
export const SERIES_MAPPING_REMOVED = "SERIES_MAPPING_REMOVED";

// 1 year TTL for mappings
const MAPPING_TTL_DAYS = 365;

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
    additionalData?: {
      malSeriesId?: number;
      totalEpisodes?: number;
      coverImage?: string;
      backgroundCoverImage?: string;
      bannerImage?: string;
      description?: string;
    }
  ): Promise<ISeriesMapping | undefined> {
    const normalizedTitle = this.normalizeTitle(seriesTitle);

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
   */
  async cleanupExpiredMappings(): Promise<void> {
    try {
      await db.cleanupExpiredSeriesMappings();
    } catch (error) {
      logger.error("Error cleaning up expired mappings");
    }
  }

  /**
   * Get mapping statistics
   */
  async getStats(): Promise<{
    totalMappings: number;
    platformCounts: Record<string, number>;
    expiredCount: number;
    recentCount: number;
  }> {
    try {
      const allMappings = await this.getAllMappings();
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

      const stats = {
        totalMappings: allMappings.length,
        platformCounts: {} as Record<string, number>,
        expiredCount: 0,
        recentCount: 0,
      };

      // Count by platform and check expiry
      for (const mapping of allMappings) {
        stats.platformCounts[mapping.source_platform] = (stats.platformCounts[mapping.source_platform] || 0) + 1;

        if (mapping.expires_at <= now) {
          stats.expiredCount++;
        }

        if (mapping.created_at >= weekAgo) {
          stats.recentCount++;
        }
      }

      return stats;
    } catch (error) {
      logger.error("Error getting mapping stats");
      return { totalMappings: 0, platformCounts: {}, expiredCount: 0, recentCount: 0 };
    }
  }
}

// Export singleton instance
export const seriesMappingStorage = new SeriesMappingStorage();
