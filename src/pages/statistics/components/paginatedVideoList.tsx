import React from "react";
import { Box, Button, Flex, Table, Tbody, Td, Th, Thead, Tr, Text, Link } from "@chakra-ui/react";
import { useVideoPagination } from "@/hooks/useVideoPagination";
import { MdArrowBackIosNew, MdArrowForwardIos } from "react-icons/md";
import { formatDuration, formatTimestamp } from "@/utils";
import UpdateVideo from "@/pages/popup/components/updateVideo";
import DeleteVideo from "@/pages/popup/components/deleteVideo";

function PaginatedVideoList() {
  const { page, paginatedResult, handleNext, handlePrevious } = useVideoPagination();

  return (
    <Box width={"full"} boxShadow={"dark-lg"} rounded={"2xl"} p={4} my={4}>
      <Flex alignItems={"center"} justifyContent={"space-between"} my={2}>
        <Flex gap={2}>
          <Button size={"sm"} onClick={handlePrevious} disabled={page === 0} rounded={"full"}>
            <MdArrowBackIosNew />
            Previous
          </Button>
          <Button size={"sm"} onClick={handleNext} disabled={page === paginatedResult.totalPages - 1} rounded={"full"}>
            Next
            <MdArrowForwardIos />
          </Button>
        </Flex>
        <Text fontSize={"small"}>
          Page: {page + 1} / {paginatedResult.totalPages}
        </Text>
      </Flex>
      <Table variant={"simple"} size={"sm"}>
        <Thead>
          <Tr>
            <Th>Title</Th>
            <Th>Duration</Th>
            <Th>CreatedAt</Th>
            <Th>Origin</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {paginatedResult.results.map((video) => (
            <Tr key={video.id}>
              <Td isTruncated maxWidth={"xs"} title={video.video_title}>
                {video.video_url ? (
                  <Link href={video.video_url} isExternal>
                    {video.video_title}
                  </Link>
                ) : (
                  video.video_title
                )}
              </Td>
              <Td>{formatDuration(video.video_duration)}</Td>
              <Td>{formatTimestamp(video.created_at)}</Td>
              <Td>{video.origin}</Td>
              <Td key={video.id}>
                <Flex flexDirection={"row"} gap={1}>
                  <UpdateVideo {...video} />
                  <DeleteVideo id={video.id} />
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export default PaginatedVideoList;
