import React, { useState, useEffect } from "react";
import IndexedDB from "@/db/index";
import { IPaginatedVideos } from "@/types/video";
import { Box, Button, Flex, Table, TableCaption, Tbody, Td, Th, Thead, Tr, Text } from "@chakra-ui/react";

function PaginatedVideoList() {
  const [page, setPage] = useState(0);
  const [paginatedResult, setPaginatedResult] = useState<IPaginatedVideos>({
    page: 0,
    pageSize: 0,
    results: [],
    totalPages: 0,
  });
  const pageSize = 10; // Set your desired page size

  useEffect(() => {
    async function fetchData() {
      const result = await IndexedDB.getVideosByPagination(page, pageSize);
      setPaginatedResult(result);
    }
    fetchData();
  }, [page]);

  const handleNext = () => {
    if (page < paginatedResult.totalPages - 1) {
      setPage(page + 1);
    }
  };

  const handlePrevious = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  return (
    <Box width={"full"} height={"500px"} boxShadow={"dark-lg"} rounded={"2xl"} p={4}>
      <Flex alignItems={"center"} justifyContent={"space-between"}>
        <Flex gap={2}>
          <Button onClick={handlePrevious} disabled={page === 0}>
            Previous
          </Button>
          <Button onClick={handleNext} disabled={page === paginatedResult.totalPages - 1}>
            Next
          </Button>
        </Flex>
        <Text>
          Page: {page + 1} / {paginatedResult.totalPages}
        </Text>
      </Flex>
      <Table variant={"simple"} size={"sm"}>
        <TableCaption>All captured items</TableCaption>
        <Thead>
          <Tr>
            <Th>Title</Th>
            <Th>Origin</Th>
            <Th>CreatedAt</Th>
          </Tr>
        </Thead>
        <Tbody>
          {paginatedResult.results.map((video) => (
            <Tr key={video.id}>
              <Td>{video.video_title}</Td>
              <Td>{video.origin}</Td>
              <Td>{video.created_at}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export default PaginatedVideoList;
