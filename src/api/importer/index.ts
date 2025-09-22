import { IVideo } from "@/types/video";
import { ITag } from "@/types/tag";
import { KitaSchema } from "@/types/kitaschema";
import IndexedDB from "@/db/index";
import { generateUniqueCode } from "@/utils";
import logger from "@/config/logger";
import { settingsManager, SETTINGS } from "@/api/settings";
import { seriesMappingStorage } from "@/api/seriesMapping";
import { ISeriesMapping } from "@/types/integrations/seriesMapping";

const BATCH_SIZE = 50;

export type ImportProgress = {
  phase: string;
  current: number;
  total: number;
  percentage: number;
};

export type ProgressCallback = (progress: ImportProgress) => void;

// Process items in batches with progress reporting
const processBatchWithProgress = async <T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  phase: string,
  onProgress?: ProgressCallback
): Promise<void> => {
  const total = items.length;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(processor));

    const current = Math.min(i + BATCH_SIZE, items.length);
    const percentage = Math.round((current / total) * 100);

    if (onProgress) {
      onProgress({ phase, current, total, percentage });
    }

    logger.info(`${phase}: ${current}/${total} (${percentage}%)`);

    // Progressive delay based on dataset size
    if (i + BATCH_SIZE < items.length) {
      const delay = items.length > 500 ? 50 : items.length > 100 ? 30 : 20;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

const importFromJSON = async (file: File, onProgress?: ProgressCallback): Promise<void> => {
  try {
    onProgress?.({ phase: "Reading file", current: 0, total: 100, percentage: 0 });

    const text = await file.text();
    const data: KitaSchema = JSON.parse(text);

    onProgress?.({ phase: "Parsing data", current: 25, total: 100, percentage: 25 });

    logger.info("Starting import process...");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Count total items for overall progress
    const totalItems =
      (data.UserItems.Videos?.length || 0) +
      (data.UserItems.Tags?.length || 0) +
      (data.UserItems.VideoTagRelationships?.length || 0) +
      (data.UserItems.AutoTags?.length || 0) +
      (data.UserItems.SeriesMappings?.length || 0) +
      1; // +1 for settings

    let processedItems = 0;

    // Import videos
    const videosToAdd = data.UserItems.Videos;
    if (videosToAdd && videosToAdd.length > 0) {
      await processBatchWithProgress(
        videosToAdd,
        async (video: IVideo) => {
          if (video.unique_code) {
            await IndexedDB.addVideo(video);
          } else {
            const uniqueCode = generateUniqueCode(video.video_title, video.origin);
            await IndexedDB.addVideo({ ...video, unique_code: uniqueCode });
          }
        },
        "Importing videos",
        onProgress
      );
      processedItems += videosToAdd.length;
    }

    // Import tags
    const tagsToAdd = data.UserItems.Tags;
    if (tagsToAdd && tagsToAdd.length > 0) {
      await processBatchWithProgress(
        tagsToAdd,
        async (tag: ITag) => {
          await IndexedDB.addTag({ id: tag.id, name: tag.name, created_at: tag.created_at });
        },
        "Importing tags",
        onProgress
      );
      processedItems += tagsToAdd.length;
    }

    // Import video tag relationships
    const videoTagRelationshipsToAdd = data.UserItems.VideoTagRelationships;
    if (videoTagRelationshipsToAdd && videoTagRelationshipsToAdd.length > 0) {
      await processBatchWithProgress(
        videoTagRelationshipsToAdd,
        async (relationship) => {
          await IndexedDB.addVideoTag(relationship);
        },
        "Importing video-tag relationships",
        onProgress
      );
      processedItems += videoTagRelationshipsToAdd.length;
    }

    // Import auto tags
    const autoTagsToAdd = data.UserItems.AutoTags;
    if (autoTagsToAdd && autoTagsToAdd.length > 0) {
      await processBatchWithProgress(
        autoTagsToAdd,
        async (autoTag) => {
          await IndexedDB.addAutoTag(autoTag);
        },
        "Importing auto tags",
        onProgress
      );
      processedItems += autoTagsToAdd.length;
    }

    // Import series mappings
    const seriesMappingsToAdd = data.UserItems.SeriesMappings as ISeriesMapping[] | undefined;
    if (seriesMappingsToAdd && seriesMappingsToAdd.length > 0) {
      await processBatchWithProgress(
        seriesMappingsToAdd,
        async (mapping: ISeriesMapping) => {
          try {
            const now = Date.now();
            const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

            let expires_at = mapping.expires_at ?? now + ONE_YEAR_MS;

            // If mapping is expired, reset TTL to 1 year from now
            // If mapping is not expired, extend TTL by 1 year
            if (expires_at <= now) {
              expires_at = now + ONE_YEAR_MS;
            } else {
              expires_at = expires_at + ONE_YEAR_MS;
            }

            // Create mapping using storage API (will set normalized_title, created_at etc.)
            const createdMapping = await seriesMappingStorage.createMapping({
              series_title: mapping.series_title,
              source_platform: mapping.source_platform as any,
              season_year: mapping.season_year,
              anilist_series_id: mapping.anilist_series_id,
              mal_series_id: mapping.mal_series_id,
              kitsu_series_id: mapping.kitsu_series_id,
              tmdb_series_id: mapping.tmdb_series_id,
              user_confirmed: mapping.user_confirmed ?? false,
              total_episodes: mapping.total_episodes,
              series_description: mapping.series_description,
              cover_image: mapping.cover_image,
              background_cover_image: mapping.background_cover_image,
              banner_image: mapping.banner_image,
            });

            // Update expires_at to our calculated value
            if (createdMapping) {
              await seriesMappingStorage.updateMapping(createdMapping.id, { expires_at });
            }
          } catch (err) {
            logger.error(`Failed to import series mapping ${mapping.series_title}: ${err}`);
          }
        },
        "Importing series mappings",
        onProgress
      );

      processedItems += seriesMappingsToAdd.length;
    }

    // Import application settings with backward compatibility
    onProgress?.({
      phase: "Importing settings",
      current: processedItems,
      total: totalItems,
      percentage: Math.round((processedItems / totalItems) * 100),
    });

    // Handle different formats of boolean settings for backward compatibility
    const getApplicationEnabled = (value: any): boolean => {
      if (typeof value === "boolean") return value;
      if (typeof value === "object" && value !== null) {
        return value.IsApplicationEnabled === true;
      }
      return false;
    };

    const getContentScriptEnabled = (value: any): boolean => {
      if (typeof value === "boolean") return value;
      if (typeof value === "object" && value !== null) {
        return value.IsContentScriptEnabled === true;
      }
      return true; // Default to true for content script
    };

    const getAnilistSyncMedia = (value: any): boolean => {
      if (typeof value === "boolean") return value;
      return true; // Default to true
    };

    await Promise.all([
      settingsManager.set(SETTINGS.application.enabled, getApplicationEnabled(data.ApplicationSettings.IsApplicationEnabled)),
      settingsManager.set(
        SETTINGS.application.contentScriptEnabled,
        getContentScriptEnabled(data.ApplicationSettings.IsContentScriptEnabled)
      ),
      settingsManager.set(SETTINGS.integrations.anilist.autoSync, getAnilistSyncMedia(data.ApplicationSettings.AnilistSyncMedia)),
    ]);

    onProgress?.({ phase: "Finalizing", current: totalItems, total: totalItems, percentage: 100 });
    await new Promise((resolve) => setTimeout(resolve, 200));

    logger.info("Import completed successfully");
  } catch (error) {
    logger.error(`Error while importing data: ${error}`);
    throw error;
  }
};

export { importFromJSON };
