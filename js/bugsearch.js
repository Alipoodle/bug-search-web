var trelloKey;
var trelloToken;
if (typeof(Storage) !== 'undefined') {
    trelloKey = localStorage.getItem('key');
    trelloToken = localStorage.getItem('token');
}
else {
    alert('This browser does not support Localstorage. Keys/Tokens will have to be manually inputted in each time.');
}

// ==============================================

var mm = {
    dark: {
        d: "Light Mode",
        m: "sun"
    },
    light: {
        d: "Dark Mode",
        m: "moon"
    }
};

function loadTheme() {
    var light = false;
    if (typeof(Storage) !== 'undefined') {
        light = (localStorage.getItem('light') == 'true');
    }
    return light;
}

function setTheme() {
    if (typeof(Storage) !== 'undefined') {
        var light = false;
        if ($('body').attr('class') == 'light') {
            light = true;
        }
        localStorage.setItem('light', light.toString());
    }
}

function switchMode() {
    var bc = $('body').toggleClass('light')[0].className;
    if (bc == '') {
        bc = 'dark';
    }
    $('#switch-mobile').html('<i class="far fa-' + mm[bc].m + '"></i>');
    $('#switch-desktop').html('<i class="far fa-' + mm[bc].m + '"></i> ' + mm[bc].d);
    setTheme();
}

function pageLoad(page) {
    var cb_btn = '';
    var st = '';
    switch (page) {
        case "b":
            cb_btn = '#copy-btn';
            st = '#syntax';
            break;
        case "a":
            cb_btn = '#edit-copy-btn';
            st = '#edit-syntax';
            break;
    }
    var cb = new ClipboardJS(cb_btn, {
        text: function(trigger) {
            return $(st).text();
        }
    });
    cb.on('success', function(e) {
        $(e.trigger).html('Copied');
        ga('send', 'event', 'syntax', 'copy');
        setTimeout(function() {
            $(e.trigger).html('Copy');
        }, 2000);
    });
    $('body').on('click', 'a[id*="switch-"]', switchMode);
    if (loadTheme()) {
        switchMode();
    }
}
