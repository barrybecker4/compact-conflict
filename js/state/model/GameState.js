import gameInitialization from '../../gameInitialization.js';
import gameData from '../gameData.js';
import utils from '../../utils/utils.js';
import sequenceUtils from '../../utils/sequenceUtils.js';
import aiPlay from '../../server/aiPlay.js';
import UPGRADES from './UPGRADES.js';

// global counter for the number of soldiers
var soldierCounter;


export default class GameState {

    constructor(players, regions, owner, temples, soldiers, cash, level, move, a, flt) {
        this.p = players;
        this.r = regions;
        this.o = owner;
        this.t = temples;
        this.s = soldiers;
        this.c = cash;
        this.l = level;
        this.m = move;
        this.a = a;
        this.flt = flt;
    }

    soldierCount(region) {
        var list = this.s[region.index];
        return list ? list.length : 0;
    }

    income(player) {
        // no income with no temples
        var playerTemples = this.temples(player);
        if (!playerTemples.length) return 0;

        // 1 faith per region
        var fromRegions = this.regionCount(player);

        // 1 faith per each soldier at a temple
        const self = this;
        var fromTemples = sequenceUtils.sum(playerTemples, function(temple) {
            return self.soldierCount(temple.region);
        });
        var multiplier = 1.0 + 0.01 * this.upgradeLevel(player, UPGRADES.WATER);
        if ((player.u == aiPlay.aiPickMove) && (gameInitialization.gameSetup.l == gameData.AI_EVIL))
            multiplier += 0.4;
        return Math.ceil(multiplier * (fromRegions + fromTemples));
    }

    regionHasActiveArmy(player, region) {
        return (this.m.movesRemaining > 0) &&
            (this.owner(region) == player) && this.soldierCount(region) &&
            (!sequenceUtils.contains(this.m.z, region));
    }

    regionCount(player) {
        var total = 0;
        const self = this;
        utils.map(this.r, function(region) {
            if (self.owner(region) == player)
                total++;
        });
        return total;
    }

    temples(player) {
        var temples = [];
        let self = this;
        utils.forEachProperty(this.t, function(temple, regionIndex) {
            if (self.o[regionIndex] == player)
                temples.push(temple);
        });
        return temples;
    }

    activePlayer() {
        return this.p[this.m.playerIndex];
    }

    owner(region) {
        return this.o[region.index];
    }

    cash(player) {
        return this.c[player.index];
    }

    rawUpgradeLevel(player, upgradeType) {
        return sequenceUtils.max(utils.map(this.temples(player), function(temple) {
            if (temple.upgrade && temple.upgrade == upgradeType)
                return temple.level + 1;
            else
                return 0;
        }).concat(0));
    }

    upgradeLevel(player, upgradeType) {
        if (!player) {
            // neutral forces always have upgrade level 0;
            return 0;
        }

        let self = this;
        return sequenceUtils.max(utils.map(this.r, function(region) {
            // does it have a temple?
            var temple = self.t[region.index];
            if (!temple) return 0;
            // does it belong to us?
            if (self.owner(region) != player) return 0;
            // does it have the right type of upgrade?
            return (temple.upgrade == upgradeType) ? upgradeType.level[temple.level] : 0;
        }));
    }

    totalSoldiers(player) {
        let self = this;
        return sequenceUtils.sum(this.r, function(region) {
            return (self.owner(region) == player) ? self.soldierCount(region) : 0;
        });
    }

    soldierCost() {
        return UPGRADES.SOLDIER.cost[this.m.h || 0];
    }

    templeInfo(temple) {
        if (!temple.upgrade) {
            var name = this.owner(temple.region) ? "Basic Temple" : "Neutral Temple";
            return {n: name, d: "No upgrades."};
        } else {
            let upgrade = temple.upgrade;
            let level = temple.level;
            let description = utils.template(upgrade.desc, upgrade.level[level]);
            return {n: utils.template(upgrade.name, gameData.LEVELS[level]), d: description};
        }
    }

    addSoldiers(region, count) {
        const self = this;
        utils.map(utils.range(0, count), function() {
            soldierCounter = (soldierCounter + 1) || 0;

            var soldierList = self.s[region.index];
            if (!soldierList) {
                soldierList = [];
                self.s[region.index] = [];
            }

            soldierList.push({ i: soldierCounter++ });
        });
    }

    // Some properties are omitted - namely 'd', the current 'move decision' partial state
    copy(simulatingPlayer) {
        return new GameState(
            this.p,
            this.r,
            utils.deepCopy(this.o, 1),
            utils.deepCopy(this.t, 2),
            utils.deepCopy(this.s, 3),
            utils.deepCopy(this.c, 1),
            utils.deepCopy(this.l, 1),
            utils.deepCopy(this.m, 1),
            this.a || simulatingPlayer,
            this.flt
        );
    }
}
