// import { getTagById, getTags, setTags, updateTagById, deleteTagById, deleteAllTags } from "./index";

// jest.mock("uuid", () => ({
//   v4: jest.fn(() => "c9231866-2a26-4f27-b00a-fa8bb88097a2"),
// }));

// // Mock Chrome storage
// const mockChrome = {
//   storage: {
//     local: {
//       get: jest.fn(),
//       set: jest.fn(),
//       remove: jest.fn(),
//     },
//   },
// };

// const mockTags = [
//   { id: "12181275-7fbb-4d84-9fbb-eb7ca1eda6dc", name: "tag1" },
//   { id: "de593ded-8bbc-496e-b690-501c1b20bd98", name: "tag2" },
// ];

// describe.skip("tagsStorage", () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//     global.chrome = mockChrome as never;
//   });

//   it("gets tag by id", () => {
//     const tag = getTagById(mockTags[0].id, mockTags);
//     expect(tag).toEqual(mockTags[0]);
//   });

//   it("gets all tags", () => {
//     const callback = jest.fn();
//     getTags(callback);
//     expect(chrome.storage.local.get).toHaveBeenCalled();
//   });

//   it("sets all tags", () => {
//     const callback = jest.fn();
//     setTags(mockTags, callback);
//     expect(chrome.storage.local.set).toHaveBeenCalled();
//   });

//   it("updates a tag by id", () => {
//     const callback = jest.fn();
//     const updatedTag = { id: mockTags[0].id, name: "updatedTag" };
//     updateTagById(mockTags[0].id, updatedTag, mockTags, callback);
//     expect(chrome.storage.local.set).toHaveBeenCalled();
//   });

//   it("deletes a tag by id", () => {
//     const callback = jest.fn();
//     deleteTagById(mockTags[0].id, mockTags, callback);
//     expect(chrome.storage.local.set).toHaveBeenCalled();
//   });

//   it("deletes all tags", () => {
//     const callback = jest.fn();
//     deleteAllTags(callback);
//     expect(chrome.storage.local.remove).toHaveBeenCalled();
//   });
// });
