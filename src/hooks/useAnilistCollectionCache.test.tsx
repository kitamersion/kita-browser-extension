import { renderHook, waitFor } from "@testing-library/react";
import { useAnilistCollectionCache } from "./useAnilistCollectionCache";
import IndexedDB from "@/db/index";

jest.mock("@/db/index", () => ({
  __esModule: true,
  default: {
    getAniListCache: jest.fn(),
    setAniListCache: jest.fn(),
  },
}));

const mockGetAniListCache = IndexedDB.getAniListCache as jest.Mock;
const mockSetAniListCache = IndexedDB.setAniListCache as jest.Mock;

describe("useAnilistCollectionCache", () => {
  beforeEach(() => {
    mockGetAniListCache.mockReset();
    mockSetAniListCache.mockReset();
  });

  test("returns the cached value without calling fetchFn on a cache hit", async () => {
    mockGetAniListCache.mockResolvedValue(["Action", "Comedy"]);
    const fetchFn = jest.fn();

    const { result } = renderHook(() => useAnilistCollectionCache("genreCollection", 1000, fetchFn));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(["Action", "Comedy"]);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(mockSetAniListCache).not.toHaveBeenCalled();
  });

  test("calls fetchFn and caches the result on a cache miss", async () => {
    mockGetAniListCache.mockResolvedValue(undefined);
    const fetchFn = jest.fn().mockResolvedValue(["Action", "Comedy"]);

    const { result } = renderHook(() => useAnilistCollectionCache("genreCollection", 1000, fetchFn));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(["Action", "Comedy"]);
    expect(mockSetAniListCache).toHaveBeenCalledWith("genreCollection", ["Action", "Comedy"], 1000);
  });

  test("sets an error and does not cache when fetchFn rejects", async () => {
    mockGetAniListCache.mockResolvedValue(undefined);
    const fetchFn = jest.fn().mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useAnilistCollectionCache("genreCollection", 1000, fetchFn));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toEqual(new Error("network down"));
    expect(result.current.data).toBeUndefined();
    expect(mockSetAniListCache).not.toHaveBeenCalled();
  });
});
