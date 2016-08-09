// Chrome automatically creates a background.html page for this to execute.
// This can access the inspected page via executeScript
// 
// Can use:
// chrome.tabs.*
// chrome.extension.*

chrome.extension.onConnect.addListener(function (devToolsConnection) {

    var extensionListener = function (message, sender, sendResponse) {

        if (message.tabId) {
            //Evaluate script in inspectedPage
            if (message.action === 'code') {
                chrome.devtools.inspectedWindow.eval(message.content,
                    { useContentScriptContext: true },
                    function (result, isException) {
                        if (isException)
                            console.log("the page ...");
                        else
                            console.log("The page ..." + result);
                    });

                //Attach script to inspectedPage
            } else if (message.action === 'script') {
                chrome.tabs.executeScript(message.tabId, { file: message.content });
            }
            else if (message.action === 'save') {
                saveFile(message.folder, message.url);
            }
            else {
                //Pass message to inspectedPage
                chrome.tabs.sendMessage(message.tabId, message, sendResponse);
            }

            // This accepts messages from the inspectedPage and 
            // sends them to the panel
        }
        else {
            devToolsConnection.postMessage(message);
        }
        sendResponse(message);
    }

    // Listens to messages sent from the panel
    chrome.extension.onMessage.addListener(extensionListener);

    devToolsConnection.onDisconnect.addListener(function (port) {
        chrome.extension.onMessage.removeListener(extensionListener);
    });

});
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    return true;
});

// set an error to be shown in panel
function setError(s, url, forced) {
    localStorage.error = s;

    if (url && !forced) {
        var obj = _findFile(url);
        obj.counter += 1;
    }
}

function versionPair(major, minor) {
    return {
        major: parseInt(major),
        minor: parseInt(minor),
        toString: function() {
            return this.major + '.' + this.minor;
        }
    }
}

var protocolVersion = versionPair(1, 0);

function saveFile(folder, url) {
    console.log('save file', folder, url);
    //clear error
    setError('');
    var serverUrl = 'http://127.0.0.1:8088';
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function (event) {
        if (xhr.readyState == 4) {
            if (xhr.status === 200) {
                if (!xhr.responseText.startsWith("OK")) {
                    // server error
                    setError(xhr.responseText, url, false);
                } else {
                    // success!
                    setError("0");
                }
            } else {
                // error in http call
                setError("Local server not running?", url, false);
            }
        }
    };
    xhr.open('POST', serverUrl, true);
    xhr.setRequestHeader('x-path', folder);
    xhr.setRequestHeader('x-url', url);
    xhr.setRequestHeader('x-autosave-version', protocolVersion.toString());
    
    xhr.send();

    // var xhttp = new XMLHttpRequest();
    // xhttp.onreadystatechange = function () {
    //     if (xhttp.readyState == 4 && xhttp.status == 200) {
    //         console.log(xhttp.responseText);
    //     }
    // };
    // xhttp.open("POST", "http://www.w3schools.com/ajax/demo_post.asp", true);
    // xhttp.send();
}