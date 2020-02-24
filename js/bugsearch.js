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

var defaultBoards = {
    "5771673855f47b547f2decc3": "Desktop",
    "57f2a306ca14741151990900": "Android",
    "57f2d333b99965a6ba8cd7e0": "iOS",
    "5846f7fdfa2f44d1f47267b0": "Linux",
    "5bc7b4adf7d2b839fa6ac108": "Store",
    "5cc22e6be84de608c791fdb6": "Web",
    "5cbfb347e17452475d790070": "Overlay"
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

    // =========================
    //   Trello Stuff + Boards
    // =========================
    if (typeof(Storage) !== 'undefined') {
        trelloKey   = localStorage.getItem('trello-key');
        trelloToken = localStorage.getItem('trello-token');
        boards      = localStorage.getItem('boards') || null;

        if (boards) {
            boards = JSON.parse(boards);
        }
        else {
            boards = JSON.parse(JSON.stringify(defaultBoards));
        }
        $('#input-key').val(trelloKey);
        $('#input-token').val(trelloToken);
        updateSelect();

        var textField = $('#text-extra-trello');
        for (var boardID in boards) {
            if (defaultBoards[boardID]) { continue; }
            var boardName = boards[boardID];

            if (textField.val() == "") {
                textField.val(boardID + " " + boardName);
            }
            else {
                textField.val(
                    $('#text-extra-trello').val() + "\n" +
                    boardID + " " + boardName
                );
            }

        }
    }
    else {
        boards = JSON.parse(JSON.stringify(defaultBoards));
        updateSelect();
    }

    // =========================
    //      Event Handlers
    // =========================
    window.onpopstate = function(e){
        if (e.state && e.state.card) { openCard(e.state.card, true); }
        else {
            $('#card-modal').foundation('close');
        }
    };

    // $('body').on('input',    '#text-extra-trello',  updateSelect);
    $('body').on('blur',     'input[id*="input-"]', updateTrello);
    $('body').on('blur',     '#search-field',       function () {search();});
    $('body').on('input',    '#board-field',        function () {search();});
    $('body').on('change',   '#toggle-search',      toggleSearch);
    $('body').on('keypress', '#search-field',       keySearch);
    $('body').on('click',    '#buildSearch',        buildSearch);
    $('body').on('click',    'a[id*="switch-"]',    switchMode);
    // $('body').on('click',    '#search-next-page',   function() {search(true);});
    // $('body').on('click',    '#search-prev-page',   function() {search(false);});
    $('body').on('click',    '#card-toggle-extra',  toggleExtraInfo);
    $('body').on('click',    '#openboardlink',      openBoardLink);

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

    $(window).scroll(function() {
        if ($(window).scrollTop() == $(document).height() - $(window).height()) {
          search(true);
        }
    });
    $('body').on('closed.zf.reveal', '#search-modal', function() {
        $('#search-select-user, #search-must, #search-should, #search-must-not').val([]).trigger("change");
    });

    $('body').on('closed.zf.reveal', '#trello-modal', function() {
        var content = $('#text-extra-trello').val().trim();
        var lineSplit = content.split('\n');

        boards = JSON.parse(JSON.stringify(defaultBoards));

        lineSplit.forEach(function(e, i) {
            if (e == "") { return; }
            var split = e.split(' ');
            if (split.length <= 2) { return; }

            var boardid = split.shift();
            var boardname = split.join(" ");

            boards[boardid] = boardname;
        });

        updateSelect();
    })

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


    // =========================
    //        Select 2
    // =========================
    $('#search-select-user').select2({
        theme: "foundation",
        width: "100%",
        minimumInputLength: 2,
        allowClear: true,
        closeOnSelect: false,
        ajax: {
            url: "https://gnk.gnk.io/dtesters/users",
            dataType: 'json',
            delay: 150, // waits 150 millsecs after finished typing. (reduce requests)
            data: function (params) { return { limit: "25", prefix: params.term }; },
            processResults: function (data) {
                var selectdata = $.map(data.hits, function (obj, idx) {
                    obj.id = obj.user;
                    obj.val = obj.user;
                    obj.text = obj.user;
                    return obj;
                });
                return { results: selectdata };
            },
        },
        placeholder: ""
    });
    $('#search-must, #search-should, #search-must-not').on('change', function(e) {
        $(e.target).next('.select2-container').find('.select2-search__field').val("");
    });

    $("#search-must, #search-should, #search-must-not").select2({
        theme: "foundation",
        width: "100%",
        tags: true,
        closeOnSelect: false,
        tokenSeparators: [','],
    });
    $('#search-must, #search-should, #search-must-not').on('select2:open select2:opening select2:closing', function( event ) {
        $('.select2-dropdown').css('display', 'none');
    });
})();

function buildSearch() {
    var user = $('#search-select-user').select2('data');
    var must = $('#search-must').select2('data');
    var should = $('#search-should').select2('data');
    var mustnot = $('#search-must-not').select2('data');

    var query = [];
    if (user.length > 0) {
        var userString = $.map(user, function(u) { return 'user:"' + u.user + '"'; });
        query.push("(" + userString.join(" OR ") + ")");
    }
    if (must.length > 0) {
        var mustString = $.map(must, function(m) { return m.text; });
        query.push("(" + mustString.join(" AND ") + ")");
    }
    if (should.length > 0) {
        var shouldString = $.map(should, function(s) { return s.text; });
        query.push("(" + shouldString.join(" OR ") + ")");
    }
    if (mustnot.length > 0) {
        var mustnotString = $.map(mustnot, function(mn) { return mn.text; });
        query.push("NOT (" + mustnotString.join(" AND ") + ")");
    }

    $('#search-field').val("> " + query.join(" AND "));
    $('#search-modal').foundation('close');

    search();
}


// #region  Search

function keySearch(evt) {
    var $target = $(evt.target);
    var keyCode = evt.which || evt.keyCode;
    if (keyCode == 13) {
        $target.blur();
    }
}
function toggleSearch() {
    var searchMethod = $('#toggle-search').prop('checked');
    if (searchMethod === true) {
        $('#search-method').text("(BETA) ginkoid's Elasticsearch");
        $('#search-help-specific').html("You can search like normal or add a <code>></code> to use Elastic Search's Query engine [Build basic queries <a data-open='search-modal'>here</a>]");
    }
    else {
        $('#search-method').text("Trello Search");
        $('#search-help-specific').html('You can improve searches by using Trello\'s Special Operators by following this <a href="https://help.trello.com/article/808-searching-for-cards-all-boards">Guide</a>')
    }

}

var pageNum = 0;
var endOfSearch = false;
function search(newPage) {
    var searchMethod = $('#toggle-search').prop('checked');

    // Escape search if it's detected as of search.
    if (newPage && endOfSearch) { return; }
    if ($('#search-field').val().trim() == "") { return; }

    // logHistory(searchMethod);

    if (newPage === undefined) {
        gtag('event', 'search', {
            'search_term': $('#search-field').val().trim(),
            'method': (searchMethod ? "Gin ES" : "Trello")
        });
    }

    if (searchMethod === true) {
        searchGin_dtesters_es(newPage);
    }
    else {
        searchTrello(newPage);
    }
}
function searchTrello(newPage) {
    var query = $('#search-field').val();
    var board = $('#board-field').val();
    var trelloKey = $('#input-key').val();
    var trelloToken = $('#input-token').val();

    if (newPage === true) { pageNum++; }
    // else if (newPage === false) { pageNum--; }
    else { pageNum = 0; endOfSearch = false; }

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

        if (!data.cards || data.cards.length == 0) {
            if (pageNum == 0) {
                $('#report-list').empty();
                $('#report-list').append(
                    '<div class="report-item callout mbox">' +
                        '<p class="report-content"><strong>No cards found.</strong></p>' +
                    '</div>'
                );
            }
            else {
                $('#report-list').append(
                    '<p class="help-text">End of search.</p>'
                );
                endOfSearch = true;
            }
            return;
        }
        if (pageNum == 0) {
            $('#report-list').empty();
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
    // End of AJAX
}
function searchGin_dtesters_es(newPage) {
    newPage = newPage;

    var query = $('#search-field').val();
    var board = $('#board-field').val();
    var isDefault = ($('#board-field option:selected').attr('default') == "true" ? true : false);

    if (isDefault !== true) {
        alert("This Board ID is not in the default List of Boards!\nThis board cannot be searched on ginkoid's Elasticsearch");
        $('#report-list').empty();
        $('#report-list').append(
            '<div class="report-item callout mbox">' +
                '<p class="report-content"><strong>No cards found.</strong></p>' +
            '</div>'
        );
        return;
    }

    if (newPage === true) { pageNum++; }
    // else if (newPage === false) { pageNum--; }
    else { pageNum = 0; endOfSearch = false; }

    var options = {
        method: 'GET',
        url: 'https://gnk.gnk.io/dtesters/search',
        data: {
          limit: 25,
          page: pageNum,
          board: board,
          kind: 'approve',
          sort: 'relevance',
          include: 'title,link',
          highlights: 'first'
        }
      };
      if (query.indexOf('>') == 0) {
        options.data.query = query.slice(1);
      } else {
        options.data.content = query;
      }
      $.ajax(options)
        .done(function (data) {
            if (!data.hits || data.hits.length == 0) {
                if (pageNum == 0) {
                    $('#report-list').empty();
                    $('#report-list').append(
                        '<div class="report-item callout mbox">' +
                            '<p class="report-content"><strong>No cards found.</strong></p>' +
                        '</div>'
                    );
                }
                else {
                    $('#report-list').append(
                        '<p class="help-text">End of search.</p>'
                    );
                    endOfSearch = true;
                }
                return;
            }
            if (pageNum == 0) {
                $('#report-list').empty();
                $('#report-list').append(
                    '<p class="help-text">Total: '+ data.total.value +'</p>'
                );
            }
            data.hits.forEach(function (item) {
                card = item.event;

                var highlight = item.highlights[0];

                var highlightText = '';
                if (highlight !== undefined && highlight.key !== 'title') {
                    highlightText += '(' + highlight.key.charAt(0).toUpperCase() + highlight.key.slice(1) + ') ';
                    highlight.positions.forEach(function (pos, idx) {
                        var start = pos.start;
                        var end   = pos.end;
                        var prevEnd = (highlight.positions[idx - 1] || { end: 0 }).end;
                        highlightText += "".concat(highlight.text.slice(prevEnd, start), "<strong class='highlight'>").concat(highlight.text.slice(start, end), "</strong>");
                    });
                    highlightText += highlight.text.slice(highlight.positions[highlight.positions.length - 1].end);
                }

                $('#report-list').append(
                    '<div class="report-item callout mbox">' +
                        '<a class="report-title" onclick="openCard(\'' + escapeHTML(card.link) + '\')">' + escapeHTML(card.title) + '</a>' +
                        '<p class="report-content">' +
                            (highlightText !== '' ? highlightText : '') +
                            // (card.closed ? '<strong>This ticket is archived.</strong><br>' : '') +
                            // (card.list.name ? '<strong>List:</strong> ' + escapeHTML(card.list.name) + '' : '') +
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
    // End of AJAX
}
// #endregion

var maxHistoryLength = 10;
function logHistory(searchMethod) {

    var query = $('#search-field').val();
    var board = $('#board-field').val();

    if (typeof(Storage) !== 'undefined') {
        var history = JSON.parse(sessionStorage.getItem('history')) || [];
        history.push({ method: searchMethod, search: query, board: board });

        if (history.length > maxHistoryLength) {
            history = history.slice(history.length - maxHistoryLength);
        }

        sessionStorage.setItem('history', JSON.stringify(history));
    }
}

// #region  Card and Formatting
function formatDesc(desc) {
    var converter = new showdown.Converter();
    let formatted = escapeHTML(desc)       // Needs to be made safe.
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
    var searchMethod = $('#toggle-search').prop('checked');

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
            gtag('event', 'view_item', {
                'item_id'    : cardID,
                'search_term': $('#search-field').val().trim(),
                'method'     : (searchMethod ? "Gin ES" : "Trello")
            });

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

            $('#card-content').html(formatted);
            $('#card-content code').each(function(i, element) {
                var e = $(element);
                e.text(
                    e.text() .replace(/&amp;/g,  "&") .replace(/&#x2F;/g, "/")
                             .replace(/&#x3D;/g, "=") .replace(/&lt;/g,   "<")
                             .replace(/&gt;/g,   ">") .replace(/&quot;/g, '"')
                             .replace(/&#39;/g,  "'")
                );
            });
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

                        var usercomments = filteredComments[0].join('\n-----------------------\n');
                        let admincomments = filteredComments[1].join('\n-----------------------\n');
                        $('#card-cr-cnr').text(
                            "CR / CNR Ratio" + "\n" +
                            crandcnr[0] +" / "+ crandcnr[1]
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

function getReproRatio (comments) {
    var crs = 0;
    var cnrs = 0;
    comments.forEach(function(comment) {
        if (comment.memberCreator.id !== '58c07cf2115d7e5848862195') return;
        if (comment.data.text.indexOf('Can reproduce.') >= 0) {
            crs = crs + 1;
        } else if (comment.data.text.indexOf("Can't reproduce.") >= 0) {
            cnrs = cnrs + 1;
        }
    });
    return [ crs, cnrs ];
}

function filterComments (comments) {
    var userComments = [];
    var adminComments = [];
    comments.forEach(function (comment) {
        if (comment.memberCreator.id === '58c07cf2115d7e5848862195') {
            if (comment.data.text.indexOf('Can reproduce.') >= 0) return;
            if (comment.data.text.indexOf("Can't reproduce.") >= 0) return;
                userComments.push(comment.data.text)
            } else {
                adminComments.push(comment.data.text+"\n\n"+comment.memberCreator.fullName);
            }
    })
    return [ userComments, adminComments ]
}
//#endregion


function updateTrello() {
    localStorage.setItem('trello-key',   $('#input-key').val());
    localStorage.setItem('trello-token', $('#input-token').val());
}

function updateSelect() {
    // boards
    localStorage.setItem('boards', JSON.stringify(boards));

    var boardField = $('#board-field');
    var selected = boardField.val();

    boardField.empty();
    for (var boardID in boards) {
        var boardName = boards[boardID];
        var isDefault = (defaultBoards[boardID] ? "true" : "false");

        boardField.append(
            '<option default="' + isDefault + '" value="' + escapeHTML(boardID) + '">' + escapeHTML(boardName) + '</option>'
        );
    }

    setTimeout(function() {
        boardField.val(selected);
        if (boardField.val() == null) {
            boardField.val('5771673855f47b547f2decc3');
        }
    }, 1);

}

function toggleExtraInfo() {
    $('#card-extra-info').toggle();
}

function openBoardLink() {
    var trelloKey = $('#input-key').val();
    var trelloToken = $('#input-token').val();

    // https://api.trello.com/1/member/me/boards?fields=id,name&key=009a3edc6174ef8c60d65d8daf1c637b&token=9a31633c0248a6fca80d0958f02bb654e161c65e396622e88d6c28ed9cc9f25a
    window.open(
        'https://api.trello.com/1/member/me/boards?fields=id,name' +
        '&key='    + trelloKey +
        '&token=' + trelloToken
    );
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
