String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

// get elem shortcut
function elem(elem) {
    return document.getElementById(elem);
}
// dump debug
function deb(val) {
    return;

    // XXX: something fishy below: broke on latest Chrome!

    if (window.chrome) {
        var d = {"deb":val};
        chrome.extension.sendRequest(d, function(response) {});
    } else
        console.debug(val);
}


function agoStr(src) {
    var now = new Date();
    var n = (now.getTime()-src)/1000;
    if (n < 60)
        return ""+parseInt(n)+" secs ago";
    else
        return ""+parseInt(n/60)+" mins ago";
}