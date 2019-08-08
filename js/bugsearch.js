(function () {
    var trelloKey;
    var trelloToken;
    if (typeof(Storage) !== 'undefined') {
        trelloKey = localStorage.getItem('trello-key');
        trelloToken = localStorage.getItem('trello-token');
        $('#input-key').val(trelloKey);
        $('#input-token').val(trelloToken);
    }
    else {
        alert('This browser does not support Localstorage. Keys/Tokens will have to be manually inputted in each time.');
    }

    // Show Trello Token
    if (!trelloKey || trelloKey == "" || !trelloToken || trelloToken == "") {
        $(document).ready(function () {
            $('#btn-trello-modal').trigger('click');
        });
    }
})();

function keySearch(evt) {
    var $target = $(evt.target);
    var keyCode = evt.which || evt.keyCode;
    if (keyCode == 13) {
        $target.blur(); // Auto triggers - searchTrello();
    }
}

function searchTrello() {
    var query = $('#search-field').val();
    if (query.trim() == "") { return alert('Please fill some info in.'); }

    var board = $('#board-field').val();
    var trelloKey = $('#input-key').val();
    var trelloToken = $('#input-token').val();

    var options = {
        method: 'GET',
        url: 'https://api.trello.com/1/search',
        data: {
          query: query,
          idBoards: board,
          key: trelloKey,
          token: trelloToken,

          cards_limit: '25',
          card_list: true,
          card_attachments: true
          /* Fill this */

        }
      };
    $.ajax(options)
      .done(function (data) {
        $('#report-list').empty();
        if (data.cards.length == 0) { return alert('No Cards were returned.'); }
        data.cards.forEach(function (card) {
            $('#report-list').append(
                '<div class="report-item callout mbox">' +
                    '<a class="report-title" href="' + card.shortUrl + '">' + card.name + '</a>' +
                    '<p class="report-content">' +
                        (card.closed ? '<strong>This ticket is archived.</strong><br>' : '') +
                        (card.list.name ? '<strong>List:</strong> ' + card.list.name + '' : '') +
                    '</p>' +
                '</div>'
            );
        })

      })
      .fail(function () {
        // Error
      })
}

function updateTrello() {
    localStorage.setItem('trello-key',   $('#input-key').val());
    localStorage.setItem('trello-token', $('#input-token').val());
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
        case "index":
            $('body').on('blur', 'input[id*="input-"]', updateTrello);
            $('body').on('blur', '#search-field', searchTrello);
            $('body').on('keypress', '#search-field', keySearch)
            break;
    }
    $('body').on('click', 'a[id*="switch-"]', switchMode);
    if (loadTheme()) {
        switchMode();
    }
}

// cb_btn = '#edit-copy-btn';
// st = '#edit-syntax';

// var cb = new ClipboardJS(cb_btn, {
//     text: function(trigger) {
//         return $(st).text();
//     }
// });
// cb.on('success', function(e) {
//     $(e.trigger).html('Copied');
//     ga('send', 'event', 'syntax', 'copy');
//     setTimeout(function() {
//         $(e.trigger).html('Copy');
//     }, 2000);
// });
