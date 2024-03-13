import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import eventBus from "@/api/eventbus";
import { ITag } from "@/types/tag";
import { deleteAllTags, deleteTagById, getTags, setTag } from "@/api/tags";
import { TAG_DELETE_BY_ID, TAG_DELETE_ALL, TAG_SET } from "@/data/events";

interface TagContextType {
  tags: ITag[];
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
  const [tags, setTags] = useState<ITag[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const handleGetTags = useCallback(() => {
    getTags((data) => {
      setTags(data);
    });
  }, []);

  const handleDeleteAllTags = useCallback(() => {
    deleteAllTags(() => {
      setTags([]);
    });
  }, []);

  const handleDeleteById = useCallback(
    (eventData: any) => {
      const id = eventData.value.id as string;
      if (!id) {
        console.warn("No tag id found from event handler");
        return;
      }
      deleteTagById(id, tags, (data) => {
        setTags([...data]);
      });
    },
    [tags]
  );

  const handleSetTag = useCallback(
    (eventData: any) => {
      const name = eventData.value.name as string;
      if (!name) {
        console.warn("Empty or null tag name");
        return;
      }
      setTag(name, (data) => {
        setTags([...tags, data]);
      });
    },
    [tags]
  );

  useEffect(() => {
    if (!isInitialized) {
      handleGetTags();
      setIsInitialized(true);
      return () => {};
    }
  }, [handleGetTags, isInitialized]);

  // ================================================================================
  // ======================     EVENT HANDLERS      =================================
  // ================================================================================

  // handle VIDEO_DELETED_BY_ID
  useEffect(() => {
    eventBus.subscribe(TAG_DELETE_BY_ID, handleDeleteById);
    return () => {
      eventBus.unsubscribe(TAG_DELETE_BY_ID, handleDeleteById);
    };
  }, [handleDeleteById]);

  // handle VIDEO_DELETE_ALL
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

  return <TagContext.Provider value={{ tags, isInitialized }}>{children}</TagContext.Provider>;
};
