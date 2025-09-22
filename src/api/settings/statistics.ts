import IndexedDB from "@/db/index";
import { VideoStatistics, TagStatistics, Statistics } from "@/types/kitaschema";
import { calculateTotalDuration } from "@/api/statistics";
import logger from "@/config/logger";

class StatisticsService {
  /**
   * Get video statistics by computing them from the database
   */
  async getVideoStatistics(): Promise<VideoStatistics> {
    try {
      const videos = await IndexedDB.getAllVideos();
      return {
        TotalVideos: videos.length,
        TotalDurationSeconds: calculateTotalDuration(videos),
      };
    } catch (error) {
      logger.error(`Error calculating video statistics: ${error}`);
      return {
        TotalVideos: 0,
        TotalDurationSeconds: 0,
      };
    }
  }

  /**
   * Get tag statistics by computing them from the database
   */
  async getTagStatistics(): Promise<TagStatistics> {
    try {
      const tags = await IndexedDB.getAllTags();
      return {
        TotalTags: tags.length,
      };
    } catch (error) {
      logger.error(`Error calculating tag statistics: ${error}`);
      return {
        TotalTags: 0,
      };
    }
  }

  /**
   * Get all statistics
   */
  async getAll(): Promise<Statistics> {
    const [videoStats, tagStats] = await Promise.all([this.getVideoStatistics(), this.getTagStatistics()]);

    return {
      VideoStatistics: videoStats,
      TagStatistics: tagStats,
    };
  }

  /**
   * Update stored statistics values (for backward compatibility with export/import)
   * This is mainly used during import operations
   */
  async updateStoredStatistics(statistics: Partial<Statistics>): Promise<void> {
    const { settingsManager } = await import("@/api/settings/manager");
    const { SETTINGS } = await import("@/api/settings/definitions");

    try {
      const updates: Array<{ setting: any; value: any }> = [];

      if (statistics.VideoStatistics) {
        if (statistics.VideoStatistics.TotalVideos !== undefined) {
          updates.push({
            setting: SETTINGS.statistics.totalVideos,
            value: statistics.VideoStatistics.TotalVideos,
          });
        }
        if (statistics.VideoStatistics.TotalDurationSeconds !== undefined) {
          updates.push({
            setting: SETTINGS.statistics.totalDuration,
            value: statistics.VideoStatistics.TotalDurationSeconds,
          });
        }
      }

      if (statistics.TagStatistics?.TotalTags !== undefined) {
        updates.push({
          setting: SETTINGS.statistics.totalTags,
          value: statistics.TagStatistics.TotalTags,
        });
      }

      if (updates.length > 0) {
        const updateObject = updates.reduce((acc, update, index) => {
          acc[`update${index}`] = update;
          return acc;
        }, {} as any);

        await settingsManager.setMultiple(updateObject);
      }
    } catch (error) {
      logger.error(`Error updating stored statistics: ${error}`);
      throw error;
    }
  }
}

// Export singleton instance
export const statisticsService = new StatisticsService();
export default statisticsService;
