(function () {
    var trelloKey;
    var trelloToken;
    if (typeof(Storage) !== 'undefined') {
        trelloKey = localStorage.getItem('trello-key');
        trelloToken = localStorage.getItem('trello-token');
        $('#input-key').val(trelloKey);
        $('#input-token').val(trelloToken);
    }

    window.onpopstate = function(e){
        if (e.state && e.state.card) { openCard(e.state.card, true); }
        else {
            $('#card-modal').foundation('close');
        }
    };

    $('body').on('blur',     'input[id*="input-"]', updateTrello);
    $('body').on('blur',     '#search-field',       searchTrello);
    $('body').on('input',    '#board-field',        searchTrello);
    $('body').on('keypress', '#search-field',       keySearch);
    $('body').on('click',    'a[id*="switch-"]',    switchMode);
    $('body').on('click',    '#card-modal .close-button', function (e) {
        e.preventDefault();
        e.stopPropagation();
        history.back()
    });
    $('body').on('click', function (e) {
        if (e.target == $('div.reveal-overlay[style^=display]')[0]) {
            e.preventDefault();
            e.stopPropagation();
            history.back();
        }
    });
    if (loadTheme()) {
        switchMode();
    }

    function gup( name, url ) {
        if (!url) url = location.href;
        name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
        var regexS = "[\\?&]"+name+"=([^&#]*)";
        var regex = new RegExp( regexS );
        var results = regex.exec( url );
        return results == null ? null : results[1];
    }

    var startCard = gup('card');
    if (startCard) {
        history.replaceState({}, "Unofficial Discord Bug Searching Tool", "./");
        openCard(startCard);
    }
})();



function keySearch(evt) {
    var $target = $(evt.target);
    var keyCode = evt.which || evt.keyCode;
    if (keyCode == 13) {
        $target.blur();
    }
}

var pageNum = 0;
function searchTrello(newPage = false) {
    var query = $('#search-field').val();
    if (query.trim() == "") { return; }

    var board = $('#board-field').val();
    var trelloKey = $('#input-key').val();
    var trelloToken = $('#input-token').val();

    if (newPage && typeof newPage != 'object') {
        pageNum++;
        $('#board-field')[0].scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
    }
    else         { pageNum = 0; }

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
            cards_page: pageNum
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
                    '<a class="report-title" onclick="openCard(\'' + escapeHTML(card.shortLink) + '\')">' + escapeHTML(card.name) + '</a>' +
                    '<p class="report-content">' +
                        (card.closed ? '<strong>This ticket is archived.</strong><br>' : '') +
                        (card.list.name ? '<strong>List:</strong> ' + escapeHTML(card.list.name) + '' : '') +
                    '</p>' +
                '</div>'
            );
        })

      })
      .fail(function (e) {
        $('#report-list').empty();
        $('#report-list').append(
            '<div class="report-item callout mbox">' +
                '<p class="report-content"><strong>An error occurred while trying to find cards.</strong><br>Provided Error: ' + escapeHTML(e.responseText) + '</p>' +
            '</div>'
        );
      })
}

function formatDesc(desc) {
    var converter = new showdown.Converter();
    let formatted = escapeHTML(desc)
        .replace(/\n/g, '<br>')
        .replace(/####Steps to reproduce:/g, '<strong>Steps to reproduce:</strong>')
        .replace(/####Expected result:/g, '<strong>Expected result:</strong>')
        .replace(/####Actual result:/g, '<strong>Actual result:</strong>')
        .replace(/####Client settings:/g, '<strong>Client settings:</strong>')
        .replace(/####System settings:/g, '<strong>System settings:</strong>');
    formatted = converter.makeHtml(formatted);
    return formatted;
}

function formatLabels(labels) {
    var htmlLabel = [];
    labels.forEach(function(label) {
        htmlLabel.push('<span class="label label-'+escapeHTML(label.color)+'">' + escapeHTML(label.name) + '</span>');
    });
    return htmlLabel;
}

function formatAttachments(attachments) {
    var htmlAttachments = [];
    attachments.forEach(function(attachment, i) {
        var youtubeURL = attachment.url.match('^(https?://)?(www.)?(youtube.com|youtu.?be)/.+$')
        if (youtubeURL) {
            htmlAttachments.push('<a href="' + encodeURI(attachment.url) + '">Video '+(i+1)+'</a>');
        } else {
            htmlAttachments.push('<a href="' + encodeURI(attachment.url) + '">Image '+(i+1)+'</a>');
        }
    })
    return htmlAttachments;
}

function openCard(cardID, ignore = false) {
    if (!ignore) window.history.pushState({card: cardID}, 'Unofficial Discord Bug Searching Tool', '?card='+cardID);

    var trelloKey = $('#input-key').val();
    var trelloToken = $('#input-token').val();

    var options = {
        method: 'GET',
        url: 'https://api.trello.com/1/cards/'+cardID,
        data: {
          fields: 'desc,name,shortUrl,labels,closed',
          attachments: 'true',
          attachment_fields: 'url',
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
            formatted   = formatDesc(data.desc);
            labels      = formatLabels(data.labels);
            attachments = formatAttachments(data.attachments);

            $('#card-content').empty();
            $('#card-title').text(data.name);
            $('#card-board').text(data.board.name);
            $('#card-list').text(data.list.name);
            $('#card-badges').html(labels.join(""));
            if (data.closed) { $('#archived-banner').removeClass('hidden'); }
            else             { $('#archived-banner').addClass('hidden'); }
            $('#card-content').html(formatted);             // Need to fix some issues with this and XSS
            $('#card-link').attr('href', encodeURI(data.shortUrl));
            $('#card-attachments').html(attachments.join(" "));
            $('#card-modal').foundation('open');
            // var popup = new Foundation.Reveal($('#card-modal'));
            // popup.open();
        })
        .fail(function (e) {
            history.back();
            $('#report-list').empty();
            $('#report-list').append(
                '<div class="report-item callout mbox">' +
                    '<p class="report-content"><strong>An error occurred while trying to find the specific card.</strong><br>Provided Error: ' + escapeHTML(e.responseText) + '</p>' +
                '</div>'
            );
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


var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '=': '&#x3D;'
  };

  function escapeHTML (string) {
    return String(string).replace(/[&<>"'=\/]/g, function fromEntityMap (s) {
      return entityMap[s];
    });
  }
