import gameData from './gameData.js';
import utils from './utils.js';

const STORAGE_KEY = 'compact-conflict';

// the game setup screen config
var defaultSetup = {
    p: [gameData.PLAYER_HUMAN, gameData.PLAYER_AI, gameData.PLAYER_AI, gameData.PLAYER_OFF],
    l: gameData.AI_NICE,
    sound: true,
    tc: 12,
    tt: {},
};

export default {
    getSetupFromStorage,   // retrieveSetup
    storeSetupInLocalStorage, // storeSetup
};

// Gets user preferences from local storage, or returns false if there aren't any.
function getSetupFromStorage() {
    if (localStorage) {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            stored = JSON.parse(stored);
            utils.forEachProperty(defaultSetup, function (value, name) {
                if (stored[name] === undefined)
                    stored[name] = value;
            });
            return stored;
        }
    }

    return defaultSetup;
}

// Tries to store user preferences in local storage.
function storeSetupInLocalStorage(gameSetup) {
    if (localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameSetup));
    }
}