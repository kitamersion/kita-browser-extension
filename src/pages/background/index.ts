chrome.runtime.onMessage.addListener(function (
  request: { type: string; payload: any },
  sender: any,
  sendResponse: (arg0: { status: string }) => void
) {
  if (request.type === "MY_EVENT") {
    console.log("Received MY_EVENT with payload:", request.payload);
    // Do some processing here...

    // When you're done, you can send a response back
    sendResponse({ status: "OK" });
  }
});
