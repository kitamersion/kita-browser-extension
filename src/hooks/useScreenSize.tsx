import { useMediaQuery } from "@chakra-ui/react";
import { useEffect, useState } from "react";

function useScreenSize() {
  const [isMobile] = useMediaQuery("(max-width: 880px)");
  const [isSmallerScreen] = useMediaQuery("(max-width: 1280px)");
  const [columns, setColumns] = useState(3); // Default to 3 columns

  useEffect(() => {
    if (isMobile) {
      setColumns(1);
    } else if (isSmallerScreen) {
      setColumns(2);
    } else {
      setColumns(3);
    }
  }, [isMobile, isSmallerScreen]);

  return { isMobile, isSmallerScreen, columns };
}

export default useScreenSize;
