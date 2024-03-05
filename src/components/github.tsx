import React, { useCallback } from "react";
import { IconButton } from "@chakra-ui/react";
import { BsGithub } from "react-icons/bs";
import packageJson from "../../package.json";

const GitHub = () => {
  const gitHubNavigation = useCallback(() => {
    window.open(packageJson.repository.url, "_blank");
  }, []);

  return (
    <IconButton
      icon={<BsGithub />}
      aria-label="GitHub"
      variant="ghost"
      rounded="full"
      title="View project on GitHub"
      onClick={gitHubNavigation}
    />
  );
};

export default GitHub;
