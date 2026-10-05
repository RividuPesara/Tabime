browser.runtime.onMessage.addListener((message) => {
  if (message && message.type === "login") {
    return login(message.provider);
  }
});
