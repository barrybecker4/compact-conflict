import utils from '../../utils/utils.js';
import domUtils from '../utils/domUtils.js';
import CONSTS from '../../state/consts/CONSTS.js';

const MAP_WIDTH = 30;
const MAP_HEIGHT = 20;

export default {
    projectPoint, makePolygon, centerOfWeight, transformPoints,
    MAP_WIDTH, MAP_HEIGHT,
}

// Optional 3d projection for the map.
// The alpha value can be used to pseudo rotate the map.
// The transformation leaves space on the left for the side-panel.
function projectPoint(pt) {
    var x = pt[0] / MAP_WIDTH;
    var y = pt[1] / MAP_HEIGHT;
    // var alpha = x * .2 + .6;
    // y = y * alpha + 0.5 * (1 - alpha);
    return [x * 97 + 3, y * 100];
}

// Creates a new polygon with the given fill, stroke and clipping path.
function makePolygon(points, id, fill, stroke, clip) {
    stroke = stroke || "stroke:#000;stroke-width:0.25;";
    fill = fill ? "url(#" + fill + ")" : 'transparent';

    var properties = {
        i: id,
        points: points.map(projectPoint).join(' '),
        s: 'fill:' + fill + ";" + stroke + ';'
    };

    if (clip) {
       properties['clip-path'] = clip;
    }

    return domUtils.elem('polygon', properties);
}


// Returns the center of weight of a given set of [x, y] points.
function centerOfWeight(points) {
    let xc = 0.0;
    let yc = 0.0;
    let len = points.length;
    points.map(function(p) {
        xc += p[0];
        yc += p[1];
    });
    return [xc / len, yc / len];
}

// Affine transform of a sequence of points: [x*xm+xd,y*ym+yd]
function transformPoints(points, xm, ym, xd, yd) {
    var c = centerOfWeight(points);
    return points.map(p => [c[0] + (p[0] - c[0]) * xm + xd, c[1] + (p[1] - c[1]) * ym + yd] );
}