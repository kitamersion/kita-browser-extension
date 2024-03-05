import { v4 as uuidv4 } from "uuid";

const generateIds = (count: number): string[] => {
  const uuids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = uuidv4();
    uuids.push(id);
  }
  return uuids;
};

const copyToClipboard = (text: string): Promise<void> => {
  return window.navigator.clipboard.writeText(text);
};

const handleWithQuotes = (withQuotes: boolean, ids: string[]): string[] => {
  return ids.map((u) => {
    return withQuotes ? `"${u}"` : u;
  });
};

const handleWithBlockCopy = (withBlockCopy: boolean, ids: string[]): string[] => {
  return ids.map((u) => {
    return withBlockCopy ? `${u},\n` : `${u},`;
  });
};

const handleArrayToString = (ids: string[]): string => {
  if (ids.length === 0) return "";

  // Remove ",\n" from the last item
  const lastItem = ids[ids.length - 1].replace(/,\s*$/, "");

  // Join array elements with a space
  return [...ids.slice(0, -1), lastItem].join(" ");
};

export { generateIds, copyToClipboard, handleWithQuotes, handleWithBlockCopy, handleArrayToString };
