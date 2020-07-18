
var appState = (function(my) {

    const APP_SETUP_SCREEN = 0;
    const APP_IN_GAME = 1;

    let currentState = APP_SETUP_SCREEN;

    my.setInGame = function(inGame) {
        currentState = inGame ? APP_IN_GAME : APP_SETUP_SCREEN;
    }

    my.isInGame = function() {
        return currentState === APP_IN_GAME;
    }

    return my;
}(appState || {}));

