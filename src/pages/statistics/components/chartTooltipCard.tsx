import { Box, Text } from "@chakra-ui/react";
import React from "react";

export type ChartTooltipCardProps = {
  label?: string;
  lines: string[];
};

const ChartTooltipCard: React.FC<ChartTooltipCardProps> = ({ label, lines }) => {
  return (
    <Box bg="bg.primary" border="1px solid" borderColor="border.primary" borderRadius="md" boxShadow="lg" px={3} py={2}>
      {label && (
        <Text fontSize="xs" color="text.tertiary" mb={1}>
          {label}
        </Text>
      )}
      {lines.map((line) => (
        <Text key={line} fontSize="sm" color="text.primary" fontWeight="medium">
          {line}
        </Text>
      ))}
    </Box>
  );
};

export default ChartTooltipCard;
