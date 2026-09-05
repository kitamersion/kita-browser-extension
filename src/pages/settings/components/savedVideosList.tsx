import React from "react";
import { Box, Button, Flex, HStack, Table, Tbody, Td, Th, Thead, Tr, Text, Link } from "@chakra-ui/react";
import { useVideoPagination } from "@/hooks/useVideoPagination";
import { MdArrowBackIosNew, MdArrowForwardIos } from "react-icons/md";
import { formatDuration, formatTimestamp } from "@/utils";
import UpdateVideo from "@/pages/popup/components/updateVideo";
import DeleteVideo from "@/pages/popup/components/deleteVideo";
import OriginToIcon from "@/pages/popup/components/originToIcon";

function SavedVideosList() {
  const { page, paginatedResult, handleNext, handlePrevious } = useVideoPagination();

  return (
    <Box
      width="full"
      bg="bg.secondary"
      border="1px solid"
      borderColor="border.primary"
      rounded="2xl"
      boxShadow="dark-lg"
      p={4}
      my={4}
      transition="all 0.2s"
    >
      <Flex alignItems="center" justifyContent="space-between" mb={4}>
        <Flex gap={2}>
          <Button
            size="sm"
            variant="kita-outline"
            onClick={handlePrevious}
            isDisabled={page === 0}
            leftIcon={<MdArrowBackIosNew />}
            data-testid="saved-videos-prev-page"
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="kita-outline"
            onClick={handleNext}
            isDisabled={page === paginatedResult.totalPages - 1}
            rightIcon={<MdArrowForwardIos />}
            data-testid="saved-videos-next-page"
          >
            Next
          </Button>
        </Flex>
        <Text fontSize="sm" color="text.secondary">
          Page {page + 1} of {Math.max(paginatedResult.totalPages, 1)}
        </Text>
      </Flex>

      {paginatedResult.results.length === 0 ? (
        <Text textAlign="center" color="text.secondary" py={8}>
          No saved videos yet.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="unstyled" size="sm">
            <Thead>
              <Tr borderBottom="1px solid" borderColor="border.primary">
                <Th color="text.tertiary" fontSize="xs" letterSpacing="wider">
                  Title
                </Th>
                <Th color="text.tertiary" fontSize="xs" letterSpacing="wider">
                  Duration
                </Th>
                <Th color="text.tertiary" fontSize="xs" letterSpacing="wider">
                  Created At
                </Th>
                <Th color="text.tertiary" fontSize="xs" letterSpacing="wider">
                  Origin
                </Th>
                <Th color="text.tertiary" fontSize="xs" letterSpacing="wider">
                  Actions
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedResult.results.map((video) => (
                <Tr
                  key={video.id}
                  borderBottom="1px solid"
                  borderColor="border.secondary"
                  transition="background 0.15s"
                  _hover={{ bg: "kita.primaryAlpha.100" }}
                >
                  <Td isTruncated maxWidth="xs" title={video.video_title} color="text.primary">
                    {video.video_url ? (
                      <Link href={video.video_url} isExternal color="accent.primary" _hover={{ opacity: 0.8 }}>
                        {video.video_title}
                      </Link>
                    ) : (
                      video.video_title
                    )}
                  </Td>
                  <Td color="text.secondary">{formatDuration(video.video_duration)}</Td>
                  <Td color="text.secondary">{formatTimestamp(video.created_at)}</Td>
                  <Td color="text.secondary">
                    <HStack spacing={1}>
                      <OriginToIcon siteKey={video.origin} iconSize={14} />
                      <Text fontSize="sm">{video.origin}</Text>
                    </HStack>
                  </Td>
                  <Td>
                    <Flex flexDirection="row" gap={1}>
                      <UpdateVideo {...video} />
                      <DeleteVideo id={video.id} />
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

export default SavedVideosList;
