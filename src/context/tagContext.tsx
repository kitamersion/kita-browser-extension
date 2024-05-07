import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import eventBus from "@/api/eventbus";
import { ITag } from "@/types/tag";
import { deleteAllTags, deleteTagById, setTag } from "@/api/tags";
import { TAG_DELETE_BY_ID, TAG_DELETE_ALL, TAG_SET, CASCADE_REMOVE_TAG_FROM_VIDEO_BY_TAG_ID } from "@/data/events";
import { useToastContext } from "./toastNotificationContext";
import IndexedDB from "@/db/index";
import { decrementTotalTags, getTotalTagCount, incrementTotalTags, resetTotalTags } from "@/api/summaryStorage/tag";

interface TagContextType {
  tags: ITag[];
  totalTagCount: number;
  isInitialized: boolean;
}

const TagContext = createContext<TagContextType | undefined>(undefined);

export const useTagContext = () => {
  const context = useContext(TagContext);
  if (!context) {
    throw new Error("useTagContext must be used within a tag provider");
  }
  return context;
};

export const TagProvider = ({ children }: PropsWithChildren<unknown>) => {
  const { showToast } = useToastContext();
  const [tags, setTags] = useState<ITag[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [totalTagCount, SetTotalTagCount] = useState<number>(0);

  const handleGetTags = useCallback(async () => {
    const allTags = await IndexedDB.getAllTags();
    setTags(allTags);
  }, []);

  const handleGetTagSummary = useCallback(() => {
    getTotalTagCount((count) => {
      SetTotalTagCount(count);
    });
  }, []);

  const handleDeleteAllTags = useCallback(async () => {
    deleteAllTags(() => {
      setTags([]);

      resetTotalTags();
      handleGetTagSummary();
    });

    showToast({
      title: "Tags deleted",
      status: "success",
    });
  }, [handleGetTagSummary, showToast]);

  const handleDeleteById = useCallback(
    async (eventData: any) => {
      const id = eventData.value.id as string;
      if (!id) {
        console.warn("No tag id found from event handler");
        return;
      }
      deleteTagById(id, tags, (data) => {
        eventBus.publish(CASCADE_REMOVE_TAG_FROM_VIDEO_BY_TAG_ID, { message: "remove tag from video", value: { id: id } });
        setTags([...data]);

        decrementTotalTags();
      });

      await IndexedDB.deleteTagById(id);
      await IndexedDB.deleteVideoTagByTagId(id);
      handleGetTagSummary();
      showToast({
        title: "Tag deleted",
        status: "success",
      });
    },
    [handleGetTagSummary, showToast, tags]
  );

  const handleSetTag = useCallback(
    async (eventData: any) => {
      const name = eventData.value.name as string;
      if (!name) {
        console.warn("Empty or null tag name");
        return;
      }
      setTag(name, (data) => {
        setTags([...tags, data]);

        incrementTotalTags();
      });

      await IndexedDB.addTag({ name: name });
      handleGetTagSummary();
      showToast({
        title: "Tag added",
        status: "success",
      });
    },
    [handleGetTagSummary, showToast, tags]
  );

  useEffect(() => {
    if (!isInitialized) {
      handleGetTags();
      handleGetTagSummary();
      setIsInitialized(true);
      return () => {};
    }
  }, [handleGetTagSummary, handleGetTags, isInitialized]);

  // ================================================================================
  // ======================     EVENT HANDLERS      =================================
  // ================================================================================

  // handle TAG_DELETE_BY_ID
  useEffect(() => {
    eventBus.subscribe(TAG_DELETE_BY_ID, handleDeleteById);
    return () => {
      eventBus.unsubscribe(TAG_DELETE_BY_ID, handleDeleteById);
    };
  }, [handleDeleteById]);

  // handle TAG_DELETE_ALL
  useEffect(() => {
    eventBus.subscribe(TAG_DELETE_ALL, handleDeleteAllTags);
    return () => {
      eventBus.unsubscribe(TAG_DELETE_ALL, handleDeleteAllTags);
    };
  }, [handleDeleteAllTags]);

  // handle TAG_SET
  useEffect(() => {
    eventBus.subscribe(TAG_SET, handleSetTag);
    return () => {
      eventBus.unsubscribe(TAG_SET, handleSetTag);
    };
  }, [handleSetTag]);

  return <TagContext.Provider value={{ tags, totalTagCount, isInitialized }}>{children}</TagContext.Provider>;
};
