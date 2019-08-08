(function () {
    var trelloKey;
    var trelloToken;
    if (typeof(Storage) !== 'undefined') {
        trelloKey = localStorage.getItem('trello-key');
        trelloToken = localStorage.getItem('trello-token');
        $('#input-key').val(trelloKey);
        $('#input-token').val(trelloToken);
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
    if (query.trim() == "") { return; }

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
            // card_attachments: true
            /* Fill this */
        }
    };
    $.ajax(options)
      .done(function (data) {
        $('#report-list').empty();
        if (data.cards.length == 0) {
            $('#report-list').append(
                '<div class="report-item callout mbox">' +
                    '<p class="report-content"><strong>No cards found.</strong></p>' +
                '</div>'
            );
            return;
        }
        data.cards.forEach(function (card) {
            $('#report-list').append(
                '<div class="report-item callout mbox">' +
                    '<a class="report-title" onclick="openCard(\'' + card.shortLink + '\')">' + card.name + '</a>' +
                    '<p class="report-content">' +
                        (card.closed ? '<strong>This ticket is archived.</strong><br>' : '') +
                        (card.list.name ? '<strong>List:</strong> ' + card.list.name + '' : '') +
                    '</p>' +
                '</div>'
            );
        })

      })
      .fail(function () {
        $('#report-list').append(
            '<div class="report-item callout mbox">' +
                '<p class="report-content"><strong>An error occurred while trying to find cards.</strong></p>' +
            '</div>'
        );
      })
}

function formatDesc(desc) {
    let formatted = desc
        .replace(/\n/g, '<br>')
        .replace(/####Steps to reproduce:/g, '<strong>Steps to reproduce:</strong>')
        .replace(/####Expected result:/g, '<strong>Expected result:</strong>')
        .replace(/####Actual result:/g, '<strong>Actual result:</strong>')
        .replace(/####Client settings:/g, '<strong>Client settings:</strong>')
        .replace(/####System settings:/g, '<strong>System settings:</strong>');
    return formatted;
}

function formatLabels(labels) {
    var htmlLabel = [];
    labels.forEach(function(label) {
        htmlLabel.push('<span class="label label-'+label.color+'">' + label.name + '</span>');
    });
    return htmlLabel;
}

function openCard(cardID) {
    var trelloKey = $('#input-key').val();
    var trelloToken = $('#input-token').val();

    var options = {
        method: 'GET',
        url: 'https://api.trello.com/1/cards/'+cardID,
        data: {
          fields: 'desc,name,shortUrl,labels,closed',
          attachments: 'true',
          attachment_fields: 'all',
          members: 'false',
          membersVoted: 'false',
          checkItemStates: 'false',
          checklists: 'none',
          checklist_fields: 'all',
          board: 'true',
          board_fields: 'name,url',
          list: 'true',

          key: trelloKey,
          token: trelloToken,
        }
      };
    $.ajax(options)
        .done(function (data) {
            formatted = formatDesc(data.desc);
            labels    = formatLabels(data.labels);

            
            $('#card-content').empty();
            $('#card-content').append(
                '<h4 class="card-title">'+ data.name + '</h4>' +
                '<h6>Board: '+ data.board.name + '</h6>' +
                '<label>List: '+ data.list.name  + '</label>' +
                (labels ? '<div class="card-badges">' + labels.join("") +'</div>' : '') +
                '<hr>' +
                (data.closed ? '<div class="banner">This card is archived</div>' : '') +
                '<p>' + formatted + '<br><a href="' + data.shortUrl + '">Trello Link</a>' + '</p>'
            )
            $('#card-modal').foundation('open');
            // var popup = new Foundation.Reveal($('#card-modal'));
            // popup.open();
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
