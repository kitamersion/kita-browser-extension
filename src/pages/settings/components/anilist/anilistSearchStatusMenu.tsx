import { Button, Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import React, { useState } from "react";
import { SiAnilist } from "react-icons/si";
import { MediaListStatus, useSetMediaListEntryByAnilistIdMutation } from "@/graphql";
import { useToastContext } from "@/context/toastNotificationContext";

const STATUS_LABELS: Record<MediaListStatus, string> = {
  [MediaListStatus.Planning]: "Planning",
  [MediaListStatus.Current]: "Watching",
  [MediaListStatus.Completed]: "Completed",
  [MediaListStatus.Paused]: "Paused",
  [MediaListStatus.Dropped]: "Dropped",
  [MediaListStatus.Repeating]: "Rewatching",
};

const STATUS_OPTIONS = Object.values(MediaListStatus);

export type AnilistSearchStatusMenuProps = {
  mediaId: number;
  initialStatus?: MediaListStatus | null;
};

const AnilistSearchStatusMenu: React.FC<AnilistSearchStatusMenuProps> = ({ mediaId, initialStatus }) => {
  const { showToast } = useToastContext();
  const [status, setStatus] = useState<MediaListStatus | null>(initialStatus ?? null);
  const [setMediaListEntry, { loading }] = useSetMediaListEntryByAnilistIdMutation();

  const handleSelect = async (nextStatus: MediaListStatus) => {
    try {
      await setMediaListEntry({ variables: { mediaId, status: nextStatus } });
      setStatus(nextStatus);
      showToast({ title: `Added to ${STATUS_LABELS[nextStatus]}`, status: "success" });
    } catch (error) {
      showToast({ title: error instanceof Error ? error.message : "Failed to update AniList list", status: "error" });
    }
  };

  return (
    <Menu isLazy>
      <MenuButton
        as={Button}
        size="sm"
        variant="kita-outline"
        leftIcon={<SiAnilist size={14} />}
        rightIcon={<ChevronDownIcon />}
        isLoading={loading}
        data-testid="anilist-search-status-menu-button"
      >
        {status ? STATUS_LABELS[status] : "Add to List"}
      </MenuButton>
      <MenuList>
        {STATUS_OPTIONS.map((option) => (
          <MenuItem key={option} onClick={() => handleSelect(option)} data-testid={`anilist-search-status-menu-option-${option}`}>
            {STATUS_LABELS[option]}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};

export default AnilistSearchStatusMenu;
