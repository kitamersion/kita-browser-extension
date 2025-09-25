import { Text, Box, HStack, VStack } from "@chakra-ui/react";
import React from "react";

interface SummaryItemProps {
  children: React.ReactNode;
  variant?: "compact" | "expanded";
}

const SummaryItem = ({ children, variant = "expanded" }: SummaryItemProps) => {
  if (variant === "compact") {
    return (
      <Box
        bg="bg.secondary"
        border="1px solid"
        borderColor="border.primary"
        rounded="lg"
        p={3}
        transition="all 0.2s"
        _hover={{
          bg: "kita.primaryAlpha.100",
          borderColor: "kita.border.accent",
          transform: "translateY(-1px)",
        }}
      >
        {children}
      </Box>
    );
  }

  return (
    <Box
      bg="bg.secondary"
      border="1px solid"
      borderColor="border.primary"
      rounded="2xl"
      p={6}
      boxShadow="dark-lg"
      transition="all 0.2s"
      _hover={{
        bg: "kita.primaryAlpha.100",
        borderColor: "kita.border.accent",
        transform: "translateY(-2px)",
        boxShadow: "2xl",
      }}
    >
      <VStack spacing={3} align="center">
        {children}
      </VStack>
    </Box>
  );
};

SummaryItem.Value = function SummaryItemValue({
  value,
  variant = "expanded",
}: {
  value: string | number;
  variant?: "compact" | "expanded";
}) {
  if (variant === "compact") {
    return (
      <Text fontSize="xl" fontWeight="bold" color="text.primary" lineHeight={1}>
        {value}
      </Text>
    );
  }

  return (
    <Text fontSize="3xl" fontWeight="bold" color="text.primary" lineHeight={1}>
      {value}
    </Text>
  );
};

SummaryItem.Title = function SummaryItemTitle({
  children,
  variant = "expanded",
}: {
  children: React.ReactNode;
  variant?: "compact" | "expanded";
}) {
  if (variant === "compact") {
    return (
      <Text fontSize="xs" color="accent.primary" fontWeight="medium" textTransform="uppercase" letterSpacing="wider" lineHeight={1}>
        {children}
      </Text>
    );
  }

  return (
    <Text fontSize="sm" color="accent.primary" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">
      {children}
    </Text>
  );
};

// Compact layout component for popup
SummaryItem.Compact = function SummaryItemCompact({ value, title }: { value: string | number; title: string }) {
  return (
    <SummaryItem variant="compact">
      <HStack spacing={2} justify="space-between" w="full">
        <SummaryItem.Title variant="compact">{title}</SummaryItem.Title>
        <SummaryItem.Value variant="compact" value={value} />
      </HStack>
    </SummaryItem>
  );
};

export default SummaryItem;
