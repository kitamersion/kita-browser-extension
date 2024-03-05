import { handleWithQuotes, handleWithBlockCopy, handleArrayToString } from ".";

describe("handleWithQuotes", () => {
  test("should wrap each string with double quotes when withQuotes is true", () => {
    const ids = ["apple", "banana", "orange"];
    const result = handleWithQuotes(true, ids);
    expect(result).toEqual(['"apple"', '"banana"', '"orange"']);
  });

  test("should not wrap strings with double quotes when withQuotes is false", () => {
    const ids = ["apple", "banana", "orange"];
    const result = handleWithQuotes(false, ids);
    expect(result).toEqual(["apple", "banana", "orange"]);
  });
});

describe("handleWithBlockCopy", () => {
  test('should add ",\n" to each string when withBlockCopy is true', () => {
    const ids = ["apple", "banana", "orange"];
    const result = handleWithBlockCopy(true, ids);
    expect(result).toEqual(["apple,\n", "banana,\n", "orange,\n"]);
  });

  test('should add "," to each string when withBlockCopy is false', () => {
    const ids = ["apple", "banana", "orange"];
    const result = handleWithBlockCopy(false, ids);
    expect(result).toEqual(["apple,", "banana,", "orange,"]);
  });
});

describe("handleArrayToString", () => {
  test('should join array elements with a space and remove ",\n" from the last item', () => {
    const ids = ["apple", "banana", "orange"];
    const result = handleArrayToString(ids);
    expect(result).toBe("apple banana orange");
  });

  test("should handle empty array case", () => {
    const ids: string[] = [];
    const result = handleArrayToString(ids);
    expect(result).toBe("");
  });
});
