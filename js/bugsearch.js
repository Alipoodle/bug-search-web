var boards;
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

var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '=': '&#x3D;'
};

(function () {
    var trelloKey;
    var trelloToken;

    if (typeof(Storage) !== 'undefined') {
        trelloKey   = localStorage.getItem('trello-key');
        trelloToken = localStorage.getItem('trello-token');
        boards      = localStorage.getItem('boards') || null;

        if (boards) {
            boards = JSON.parse(boards);
        }
        else {
            boards = {
                "5771673855f47b547f2decc3": "Desktop",
                "57f2a306ca14741151990900": "Android",
                "57f2d333b99965a6ba8cd7e0": "iOS",
                "5846f7fdfa2f44d1f47267b0": "Linux",
                "5bc7b4adf7d2b839fa6ac108": "Store",
                "5cc22e6be84de608c791fdb6": "Web",
                "5cbfb347e17452475d790070": "Overlay"
            }
        }
        $('#input-key').val(trelloKey);
        $('#input-token').val(trelloToken);
        updateSelect();
    }

    window.onpopstate = function(e){
        if (e.state && e.state.card) { openCard(e.state.card, true); }
        else {
            $('#card-modal').foundation('close');
        }
    };

    $('body').on('input',    '#text-extra-trello',  updateSelect);
    $('body').on('blur',     'input[id*="input-"]', updateTrello);
    $('body').on('blur',     '#search-field',       searchTrello);
    $('body').on('input',    '#board-field',        searchTrello);
    $('body').on('keypress', '#search-field',       keySearch);
    $('body').on('click',    'a[id*="switch-"]',    switchMode);
    $('body').on('click',    '#card-toggle-extra',  toggleExtraInfo)
    $('body').on('click',    '#card-modal .close-button', function (e) {
        e.preventDefault();
        e.stopPropagation();
        history.back()
    });



    $('body').on('click', function (e) {
        $modals = $('div.reveal-overlay');
        if (e.target == $modals[1]) {
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
function searchTrello(newPage) {
    newPage = newPage || false;

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
    let formatted = desc       // Needs to be made safe.
        .replace(/\n/g, '<br>')
        .replace(/####Steps to reproduce:/g, '<strong>Steps to reproduce:</strong>')
        .replace(/####Expected result:/g,    '<strong>Expected result:</strong>')
        .replace(/####Actual result:/g,      '<strong>Actual result:</strong>')
        .replace(/####Client settings:/g,    '<strong>Client settings:</strong>')
        .replace(/####System settings:/g,    '<strong>System settings:</strong>');
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
            htmlAttachments.push('<a target="_blank" href="' + encodeURI(attachment.url) + '">Video '+(i+1)+'</a>');
        } else {
            htmlAttachments.push('<a target="_blank" href="' + encodeURI(attachment.url) + '">Image '+(i+1)+'</a>');
        }
    })
    return htmlAttachments;
}

function openCard(cardID, ignore) {
    ignore = ignore || false;
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

            // -----------------------------

            $('#card-comments').empty();
            $('#card-cr-cnr').empty();

            var options = {
                method: 'GET',
                url: "https://api.trello.com/1/cards/"+cardID+"/actions?filter=commentCard&alimit=1",
                data: {
                    key: trelloKey,
                    token: trelloToken,
                }
            }

            $.ajax(options)
                .done(function (comments) {
                    if (!boards[comments[0].data.board.id]) {
                        comments = null;
                    }

                    if (!comments) {
                        $('#card-comments').text("No Comments on Card");
                    } else {
                        var crandcnr = getReproRatio(comments);
                        var filteredComments = filterComments(comments);

                        var usercomments = filteredComments.userComments.join('\n-----------------------\n');
                        let admincomments = filteredComments.adminComments.join('\n-----------------------\n');
                        $('#card-cr-cnr').text(
                            "CR / CNR Ratio" + "\n" +
                            crandcnr.crs +" / "+ crandcnr.cnrs
                        );
                        $('#card-comments').text(
                            "User Comments:\n" + usercomments + "\n" +
                            "Admin Comments:\n" + admincomments
                        );
                    }
                });

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

async function getComments (cardID) {
}

function getReproRatio (comments) {
    var crs = 0;
    var cnrs = 0;
    comments.forEach(comment => {
        if (comment.memberCreator.id !== '58c07cf2115d7e5848862195') return;
        if (comment.data.text.includes('Can reproduce.')) {
            crs = crs + 1;
        } else if (comment.data.text.includes(`Can't reproduce.`)) {
            cnrs = cnrs + 1;
        }
    })
    return { crs, cnrs }
}

function filterComments (comments) {
    var userComments = [];
    var adminComments = [];
    comments.forEach(comment => {
        if (comment.memberCreator.id === '58c07cf2115d7e5848862195') {
            if (comment.data.text.includes('Can reproduce.')) return;
            if (comment.data.text.includes("Can't reproduce.")) return;
                userComments.push(comment.data.text)
            } else {
                adminComments.push(comment.data.text+"\n\n"+comment.memberCreator.fullName);
            }
    })
    return { userComments, adminComments }
}


function updateTrello() {
    localStorage.setItem('trello-key',   $('#input-key').val());
    localStorage.setItem('trello-token', $('#input-token').val());
}

function updateSelect() {
    // boards
    localStorage.setItem('boards', JSON.stringify(boards));

    $('#board-field').empty();
    for (var boardID in boards) {
        const boardName = boards[boardID];

        $('#board-field').append(
            '<option value="' + escapeHTML(boardID) + '">' + escapeHTML(boardName) + '</option>'
        );
    }
}

function toggleExtraInfo() {
    $('#card-extra-info').toggle();
}

// ==============================================

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




  function escapeHTML (string) {
    return String(string).replace(/[&<>"'=\/]/g, function fromEntityMap (s) {
      return entityMap[s];
    });
  }
