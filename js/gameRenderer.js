// ==========================================================
// This part of the code creates the initial rendering of the
// game map as an SVG object.
// ==========================================================

// Returns the center of weight of a given set of [x,y] points.
function centerOfWeight(points) {
    var xc = 0.0, yc = 0.0, l = points.length;
    map(points, function(p) {
        xc += p[0]; yc += p[1];
    });
    return [xc/l, yc/l];
}

// Affine transform of a sequence of points: [x*xm+xd,y*ym+yd]
function transformPoints(points, xm, ym, xd, yd) {
    var c = centerOfWeight(points);
    return map(points, function(p) {
        return [c[0] + (p[0]-c[0]) * xm + xd, c[1] + (p[1]-c[1]) * ym + yd];
    });
}

// 3d projection for the map
// The alpha value can be used to pseudo rotate the map
function projectPoint(p) {
    var x = p[0] / mapWidth;
    var y = p[1] / mapHeight;
    // var alpha = x * .2 + .6;
    // y = y * alpha + 0.5 * (1 - alpha);
    return [x * 97 + 3, y * 100];
}

// Generate a SVG gradient stop tag.
function gradientStop(percent, color) {
    return elem('stop', {
        offset: percent + '%',
        s: 'stop-color:' + color
    });
}

// Generate a SVG gradient tag for the map.
function makeGradient(id, light, dark) {
    return elem('radialGradient', {
        i: id,
        cx: '-100%', cy: '50%',
        fx: '-100%', fy: '50%',
        r: '200%',
        gradientUnits: 'userSpaceOnUse' // we want it to scale with the map, not the region it's applied to
    }, gradientStop(60, dark) + gradientStop(100, light));
}

// Creates a new polygon with the given fill, stroke and clipping path.
function makePolygon(points, id, fill, stroke, clip) {
    stroke = stroke || "stroke:#000;stroke-width:0.25;";
    fill = fill ? "url(#" + fill + ")" : 'transparent';

    var properties = {
        i: id,
        points: map(points, projectPoint).join(' '),
        s: 'fill:' + fill + ";" + stroke + ';'
    };

    if (clip)
        properties['clip-path'] = clip

    return elem('polygon', properties);
}

// Takes the map (regions) stored in gameState.r, and creates an SVG map out of it.
function showMap(container, gameState) {
    var regions = gameState.r;

    // define gradients and clipping paths for rendering
    var defs = elem('defs', {},
            makeClipPaths() +
            makeGradient('b', '#8af', '#478') +
            makeGradient('l', '#fa6', '#530') +
            makeGradient('lh', '#fb7', '#741') +
            makeGradient('d', '#210', '#000') +
            makeGradient('w', '#55f', '#003') +
            map(gameState.p, function(player, index) {
                return makeGradient('p' + index, player.l, player.d) +
                    makeGradient('p' + index + 'h', player.h, player.hd);
            }).join(''));

    // create all the layers (5 per region)
    var ocean = makePolygon([[0,0],[mapWidth,0],[mapWidth,mapHeight],[0,mapHeight]], 'b', 'b');
    var tops = makeRegionPolys('r', 'l', 1, 1, 0, 0);
    var bottoms = makeRegionPolys('d', 'd', 1, 1, .05, .05);
    var shadows = makeRegionPolys('w', 'w', 1.05, 1.05, .2, .2, ' ');
    var highlighters = makeRegionPolys('hl', '', 1, 1, 0, 0, 'stroke:#fff;stroke-width:1.5;opacity:0.0;', 'clip');

    // replace the map container contents with the new map
    container.innerHTML = elem('svg', {
        viewbox: '0 0 100 100',
        preserveAspectRatio: 'none'
    }, defs + ocean + shadows + bottoms + tops + highlighters);

    // clean some internal structures used to track HTML nodes
    soldierDivsById = {};

    // hook up region objects to their HTML elements
    map(regions, function(region, index) {
        region.e = $('r' + index);
        region.c = projectPoint(centerOfWeight(region.p));

        region.hl = $('hl' + index);
        onClickOrTap(region.hl, invokeUICallback.bind(0, region, 'c'));
    });

    // additional callbacks for better UI
    onClickOrTap(doc.body, invokeUICallback.bind(0, null, 'c'));

    // make the temple <div>s
    makeTemples();


    // makes clipping paths for the "highlight" polygons
    function makeClipPaths() {
        return map(regions, function(region, index) {
            return elem('clipPath', {i: 'clip' + index}, makePolygon(region.p, 'cp' + index, 'l', ''));
        }).join('');
    }

    // a helper for creating a polygon with a given setup for all regions
    function makeRegionPolys(idPrefix, gradient, xm, ym, xd, yd, stroke, clip) {
        return elem('g', {}, map(regions, function(region, index) {
            return makePolygon(transformPoints(region.p, xm, ym, xd, yd), idPrefix + index, gradient, stroke, clip ? 'url(#' + clip + index + ')' : '');
        }).join(''));
    }

    // makes temple, which are just <div>s with nested <div>s (the towers)
    function makeTemples() {
        forEachProperty(gameState.t, function(temple) {

            var center = temple.r.c,
                style = 'left:' + (center[0]-1.5) + '%;top:' + (center[1]-4) + '%';

            // create the temple <div>s
            var templeHTML = div({
                c: 'o',
                s: style
            }, div({c: 'i'}, div({c: 'i'}, div({c: 'i'}, div({c: 'i'})))));
            temple.e = append('m', templeHTML);

            // retrieve elements and bind callbacks
            onClickOrTap(temple.e, invokeUICallback.bind(0, temple.r, 't'));
        });
    }
}

// Prepares the whole sidebar on the left for gameplay use.
function prepareIngameUI(gameState) {
    // turn counter
    var html = div({i: 'tc', c: 'sc'});

    // player box area
    html += div({i: 'pd', c: 'sc un'}, map(gameState.p, function(player) {
        var pid = player.i;
        return div({
            i: 'pl' + pid,
            c: 'pl',
            style: 'background: ' + player.d
        }, player.n +
            div({c: 'ad', i: 'pr' + pid}) +
            div({c: 'ad', i: 'pc' + pid})
        );
    }).join(''));

    // info box
    html += div({c: 'sc un ds', i: 'in'});

    // set it all
    $('d').innerHTML = html;

    // show stat box and undo button
    map(['mv', 'und', 'end'], show);
}



// ==========================================================
// This part of the code deals with updating the display to
// match the current game state.
// ==========================================================

var soldierDivsById = {};
function updateMapDisplay(gameState) {
    map(gameState.r, updateRegionDisplay);
    forEachProperty(gameState.t, updateTempleDisplay);

    var soldiersStillAlive = [];
    forEachProperty(gameState.s, function(soldiers, regionIndex) {
        map(soldiers, updateSoldierDisplay.bind(0, gameState.r[regionIndex]));
    });

    forEachProperty(soldierDivsById, function(div, id) {
        if (soldiersStillAlive.indexOf(parseInt(id)) < 0) {
            // this is an ex-div - in other words, the soldier it represented is dead
            $('m').removeChild(div);
            delete soldierDivsById[id]; // surprisingly, this should be safe to do during iteration - http://stackoverflow.com/a/19564686

            // spawn some particles
            var x = parseFloat(div.style.left), y = parseFloat(div.style.top);
            map(range(0,20), function() {
                var angle = Math.random() * 6.28, dist = rint(0,100) / 80;
                spawnParticle(x + sin(angle) * dist, y + cos(angle) * dist, 0, -1, '#000');
            });
        }
    });

    updateFloatingText();
    updateTooltips();
    updateSoldierTooltips();

    function updateRegionDisplay(region) {
        var regionOwner = owner(gameState, region);
        var gradientName = (regionOwner ? 'p' + regionOwner.i : 'l');

        var highlighted = contains(gameState.d && gameState.d.h || [], region) ||    // a region is highlighted if it has an available move
                          (gameState.e && regionOwner == gameState.e);               // - or belongs to the winner (end game display highlights the winner)

        // highlighting
        if (highlighted) {
            gradientName += 'h';
        }
        var highlightedOpacity = 0.1 + region.c[0] * 0.003;
        if (gameState.e || (gameState.d && gameState.d.s == region))
            highlightedOpacity *= 2;
        region.hl.style.opacity = highlighted ? highlightedOpacity : 0.0;
        region.hl.style.cursor = highlighted ? 'pointer' : 'default';

        // particles
        if (gameState.prt == region) {
            gameState.prt = 0; // only once
            map(region.p, function(point) {
                point = projectPoint(point);
                var center = region.c;
                var alpha = rint(30,100)/100;
                var startPoint = [lerp(alpha,center[0],point[0]), lerp(alpha,center[1],point[1])];
                var vx = (startPoint[0]-center[0]) / 2, vy = (startPoint[1]-center[1]) / 2 - 0.15;
                spawnParticle(startPoint[0], startPoint[1], vx, vy, '#fff');
            });
        }

        // fill
        region.e.style.fill = 'url(#' + gradientName + ')';
    }

    function updateTooltips() {
        map(doc.querySelectorAll('.ttp'), $('m').removeChild.bind($('m')));
        if (activePlayer(gameState).u != uiPickMove) return;

        // "how to move" tooltips
        var source = gameState.d && gameState.d.s;
        if (source)  {
            showTooltipOver(source, "Click this region again to change the number of soldiers.");
            // pick the furthest neighbour
            var furthest = max(source.n, function(neighbour) {
                return Math.abs(source.c[0]-neighbour.c[0]) + Math.abs(source.c[1] - neighbour.c[1]);
            });
            showTooltipOver(furthest, "Click a bordering region to move.");
        }
        if (!source) {
            // "conquering armies cannot move" tooltips
            var inactiveArmies = gameState.m.z;
            if (inactiveArmies) {
                showTooltipOver(inactiveArmies[inactiveArmies.length-1], "Armies that conquer a new region cannot move again.")
                showTooltipOver({c: [-2, 80]}, "Once you're done, click 'End turn' here.");
            }
        }
        if (gameState.m.t == 2 && gameState.m.l == 2) {
            showTooltipOver({c:[90,93]}, "If you want to undo a move or check the rules, use the buttons here.", 15);
        }
    }

    function showTooltipOver(region, text, width) {
        if (gameSetup.tt[text]) return;
        setTimeout(function() {
            gameSetup.tt[text] = 1; // don't display it again (timeout to handle multiple updateDisplays() in a row)
            storeSetupInLocalStorage(gameSetup);
        }, 500);

        width = width || 7;
        var left = region.c[0] - (width+1) * 0.5, bottom = 102 - region.c[1];
        var styles = 'bottom: ' + bottom + '%; left: ' + left + '%; width: ' + width + '%';

        append('m', div({c: 'tt ttp', s: styles}, text));
    }

    function updateTempleDisplay(temple) {
        var element = temple.e;

        // right color and right number of levels (corresponding to upgrade level)
        var templeLevels = temple.u ? (temple.l + 3) : 2;
        while (element) {
            element.style.display = (templeLevels > 0) ? 'block' : 'none';
            element.style.background = temple.u ? temple.u.b : '#999';

            templeLevels--;
            element = element.firstChild;
        }

        // which cursor should we use?
        var templeOwner = owner(gameState, temple.r);
        temple.e.style.cursor = (appState == APP_INGAME) ? ((templeOwner == activePlayer(gameState)) ? 'zoom-in' : 'help') : 'default';

        // highlight?
        var selected = gameState.d && gameState.d.w == temple;
        toggleClass(temple.e, 'l', selected);
    }

    function updateSoldierDisplay(region, soldier, index) {
        // we're still alive, so no removing our <div>
        soldiersStillAlive.push(soldier.i);

        // find or create a <div> for showing the soldier
        var domElement = soldierDivsById[soldier.i];
        if (!domElement) {
            var html = div({c: 's', s: 'display: none'});

            domElement = soldierDivsById[soldier.i] = append('m', html);
            onClickOrTap(domElement, invokeUICallback.bind(0, soldier, 's'));
        }

        // (re)calculate where the <div> should be
        var center = region.c;
        var totalSoldiers = soldierCount(gameState, region);

        var columnWidth = min([totalSoldiers,4]);
        var rowHeight = min([2 / ceil(totalSoldiers / 4), 1]);

        var x = index % 4, y = floor(index / 4);
        var xOffset = (-0.6 * columnWidth + x * 1.2);
        var yOffset = y * rowHeight + (gameState.t[region.i] ? 1.5 : 0);
        var xPosition = center[0] + xOffset - yOffset * 0.2;
        var yPosition = center[1] + xOffset * 0.2 + yOffset;

        if (soldier.a) {
            // we're attacking right now - move us closer to target region
            var targetCenter = soldier.a.c;
            xPosition = (xPosition + targetCenter[0]) / 2;
            yPosition = (yPosition + targetCenter[1]) / 2;
        }
        domElement.style.left = xPosition + '%';
        domElement.style.top  = yPosition + '%';
        domElement.style.zIndex = 20 + y * 5 + x;
        domElement.style.display = 'block';

        // selected?
        var decisionState = gameState.d || {};
        toggleClass(domElement, 'l', (decisionState.s == region) && (index < decisionState.c));
    }

    function updateSoldierTooltips() {

        map(gameState.r, function(region, regionIndex) {
            var tooltipId = 'sc' + regionIndex;
            // delete previous tooltip, if present
            var tooltip = $(tooltipId);

            // should we have a tooltip?
            var count = soldierCount(gameState, region);
            if (count > 8) {
                var selected = (gameState.d && (gameState.d.s == region)) ? gameState.d.c : 0;
                selected += sum(gameState.s[regionIndex], function(soldier) {
                    return soldier.a ? 1 : 0;
                });
                if (selected)
                    count = selected + "<hr>" + count;

                if (!tooltip) {
                    var tooltipHTML = div({
                        i: tooltipId,
                        c: 'tt stt',
                        s: "left:" + (region.c[0] - 1.5) + '%;top:' + (region.c[1] + 1.2) + '%'
                    }, '');
                    tooltip = append('m', tooltipHTML);
                }
                tooltip.innerHTML = count;
            } else if (tooltip) {
                tooltip.parentNode.removeChild(tooltip);
            }
        });
    }

    function updateFloatingText() {
        map(gameState.flt || [], function(floater) {
            var x, y;
            if (floater.r) {
                x = floater.r.c[0]; y = floater.r.c[1];
            } else {
                var node = soldierDivsById[floater.s.i];
                x = parseFloat(node.style.left) + 0.2, y = parseFloat(node.style.top) + 0.2;
            }

            x -= floater.w/2 + 0.5; y -= 4;

            var styles = "left: " + x + "%;top:" + y + "%;color:" + floater.c + ";width:" + floater.w + "%";
            var floatingNode = append('m', div({c: 'tt', s: styles}, floater.t));
            setTransform(floatingNode, "translate3d(0,0,0)");
            floatAway(floatingNode, 0, -3);
        });
        gameState.flt = 0;
    }
}

function updateIngameUI(gameState) {
    var moveState = gameState.m;
    var decisionState = gameState.d;
    var buildingMode = decisionState && (decisionState.t == BUILD_ACTION);
    var movingArmy = decisionState && decisionState.s;

    var active = activePlayer(gameState);

    // turn counter/building name
    if (buildingMode) {
        var info = templeInfo(gameState, decisionState.w);
        $('tc').innerHTML = div({}, info.n) + div({c: 'ds'}, info.d);
    } else {
        $('tc').innerHTML = 'Turn <b>' + gameState.m.t + '</b>' + ((gameSetup.tc != UNLIMITED_TURNS) ? ' / ' + gameSetup.tc : '');
    }

    // player data
    map(gameState.p, function(player, index) {
        //$('pl' + index).className = (index == moveState.p) ? 'pl' : 'pi'; // active or not?
        var regions = regionCount(gameState, player);
        var gameWinner = gameState.e;

        if (regions) {
            $('pr' + index).innerHTML = regionCount(gameState, player) + '&#9733;'; // region count
            if (gameWinner) {
                $('pc' + index).innerHTML = (gameWinner == player) ? '&#9819;' : '';
            } else {
                $('pc' + index).innerHTML = gameState.c[player.i] + '&#9775;'; // cash on hand
            }
        } else {
            $('pr' + index).innerHTML = '&#9760;'; // skull and crossbones, you're dead
            $('pc' + index).innerHTML = '';
        }
    });

    // move info
    var info;
    if (active.u == uiPickMove) {
        if (buildingMode) {
            if (owner(gameState, decisionState.r) == active)
                info = elem('p', {}, 'Choose an upgrade to build.');
            else
                info = '';
        } else if (movingArmy) {
            info = elem('p', {}, 'Click on this region again to choose how many to move.') +
                elem('p', {}, 'Click on a target region to move the army.');

        } else {

            info = elem('p', {}, 'Click on a region to move or attack with its army.') +
                elem('p', {}, 'Click on a temple to buy soldiers or upgrades with &#9775;.');
        }
    } else {
        info = elem('p', {}, active.n + ' is taking her turn.');
    }
    $('in').innerHTML = info;
    $('in').style.background = active.d;

    // active player stats
    $('pd').style.display =  buildingMode ? 'none' : 'block';
    $('mc').innerHTML = moveState.l + elem('span', {s: 'font-size: 80%'}, '&#10138;');
    $('ft').innerHTML = gameState.c[active.i] +  elem('span', {s: 'font-size: 80%'}, '&#9775;');

    // buttons
    updateButtons(decisionState && decisionState.b);

    // undo
    $('und').innerHTML = undoEnabled(gameState) ? "&#x21b6;" : "";
}

function updateButtons(buttons) {
    $('u').innerHTML = '';
    map(buttons || [], function(button, index) {
        if (button.h) return;

        var buttonContents = div({}, button.t);
        if (button.d)
            buttonContents += div({c: 'ds'}, button.d);

        var buttonHTML = elem('a', {href: '#', c: button.o ? 'off' : ''}, buttonContents);
        var buttonNode = append('u', buttonHTML);
        if (!button.o) {
            onClickOrTap(buttonNode, invokeUICallback.bind(0, index, 'b'));
        }
    });
}

var displayedState;
function updateDisplay(gameState) {
    // just for debugging
    displayedState = gameState;

    // update the graphics
    updateMapDisplay(gameState);
    updateIngameUI(gameState);

    // make sounds!
    if (gameState.sc) {
        playSound(gameState.sc);
        gameState.sc = null;
    }
}

function showBanner(background, text, delay) {
    delay = delay || 1;
    oneAtATime(delay, function() {
        // create a new banner div
        var banner = append('c', div({c: 'bn'}, text)),
            styles = banner.style;

        styles.background = background;
        styles.opacity = 0.0;
        setTransform(banner, transform(-1));

        setTimeout(function() { styles.opacity = 1.0; setTransform(banner, transform(1)); }, 100),
        setTimeout(function() { styles.opacity = 1.0; }, 600),
        setTimeout(function() { styles.opacity = 0.0; }, 1100),
        setTimeout(function() { banner.parentNode.removeChild(banner); }, 1600)
    });

    function transform(offset) {
        return "translate3d(1.2em," + offset + "em,0) rotateY(" + (10 + offset * 2) + "deg)";
    }
}

function spawnParticle(x, y, vx, vy, color) {
    var styleString = "opacity:1;left: " + x + "%;top: " + y + "%;box-shadow: 0 0 1px 1px " + color;
    var particle = append('m', div({c: 'pr', s: styleString}, ''));
    floatAway(particle, vx, vy);
}

function floatAway(elem, vx, vy) {
    setTimeout(function() {
        setTransform(elem, "translate3d(" + vx + "em," + vy + "em,0)");
        elem.style.opacity = 0.0;
    }, 50);
    setTimeout(function() {
        $('m').removeChild(elem);
    }, 3050);
}

function preserveAspect() {
    setTimeout(function() {
        var w = wnd.innerWidth, h = wnd.innerHeight, aspect = 1.65, px = 'px';
        if (w / h > aspect) {
            w = h * aspect;
        } else {
            h = w / aspect;
        }

        var styles = $('c').style;
        styles.width = w + px;
        styles.height = h + px;
        styles.fontSize = 0.025 * h + px;
    }, 1);
}