// Can use
// chrome.devtools.*
// chrome.extension.*

// Create a tab in the devtools area
//
chrome.devtools.panels.create("WebLogger", "assets/images/toast.png", "dev-tools/panel.html", function (panel) {
    console.log('web logger started');
    // reset error msg
    localStorage.error = "";

    panel.onShown.addListener(function (w) {
        //w.refreshPage();
    });
});

// chrome.devtools.panels.elements.createSidebarPane("My Sidebar",
//     function(sidebar) {
//        // sidebar initialization code here
//         sidebar.setObject({ some_data: "Some data to show" });
// });

// Create a connection to the background page
var backgroundPageConnection = chrome.runtime.connect({
    name: "devtools-page"
});

backgroundPageConnection.onMessage.addListener(function (message) {
    // Handle responses from the background page, if any
});

chrome.devtools.network.onRequestFinished.addListener(function (msg) {
    if (msg.response._transferSize > 1 * 1 && msg.request.url.match(/\.(jpeg|jpg|gif|png|html|htm|mp3|wav|xml|json|js)$/) != null) {
        console.log("image: " + msg.request.url);
        console.log(msg);

        // send data to background page
        chrome.runtime.sendMessage({
            tabId: chrome.devtools.inspectedWindow.tabId,
            action: "save",
            folder: "D:\\gamett",
            url:msg.request.url, 
            msg: msg
        }, function (response) {
            console.log(response.farewell);
        });
    }
});