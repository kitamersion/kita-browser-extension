import { Button, Popover, PopoverBody, PopoverContent, PopoverTrigger, VStack } from "@chakra-ui/react";
import React from "react";

export type AnilistYearFilterProps = {
  years: number[];
  selectedYear: number | undefined;
  onChange: (year: number | undefined) => void;
};

const AnilistYearFilter: React.FC<AnilistYearFilterProps> = ({ years, selectedYear, onChange }) => {
  return (
    <Popover isLazy placement="bottom-start">
      {({ onClose }) => (
        <>
          <PopoverTrigger>
            <Button variant="kita-outline" size="sm" data-testid="anilist-search-year-trigger">
              {selectedYear ? `Year: ${selectedYear}` : "Year"}
            </Button>
          </PopoverTrigger>
          <PopoverContent maxW="140px" bg="bg.primary" borderColor="border.primary" color="text.primary">
            <PopoverBody maxH="240px" overflowY="auto" p={2}>
              <VStack align="stretch" spacing={1}>
                <Button
                  size="sm"
                  variant="ghost"
                  justifyContent="flex-start"
                  color={!selectedYear ? "accent.primary" : "text.primary"}
                  _hover={{ bg: "kita.primaryAlpha.100" }}
                  onClick={() => {
                    onChange(undefined);
                    onClose();
                  }}
                  data-testid="anilist-search-year-option-any"
                >
                  Any year
                </Button>
                {years.map((year) => (
                  <Button
                    key={year}
                    size="sm"
                    variant="ghost"
                    justifyContent="flex-start"
                    color={selectedYear === year ? "accent.primary" : "text.primary"}
                    _hover={{ bg: "kita.primaryAlpha.100" }}
                    onClick={() => {
                      onChange(year);
                      onClose();
                    }}
                    data-testid={`anilist-search-year-option-${year}`}
                  >
                    {year}
                  </Button>
                ))}
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  );
};

export default AnilistYearFilter;
