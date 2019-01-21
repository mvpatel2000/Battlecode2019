import {SPECS} from 'battlecode';

export function Church() {
    this.turn = churchTurn;
    this.step = 0;

    let broadcastingPilgrims = this.getVisibleRobots().filter(i => (i.unit == SPECS.PILGRIM) &&
        Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && i.signal>=0);

    this.nearbyMines = [];
    this.defensePositions = [];
    if(broadcastingPilgrims.length > 0 && broadcastingPilgrims[0].signal > 0) { //it is a mission church!
        this.resourceClusters = this.clusterResourceTiles();
        this.myClusterIndex = this.findNearestClusterIndex([this.me.x, this.me.y], this.resourceClusters);
        let missionMineLocation = this.decodeExactLocation(broadcastingPilgrims[0].signal);
        this.nearbyMines = this.resourceClusters[this.myClusterIndex].filter(i => !this.arrEq(i, missionMineLocation));
        this.homeSaturated = false;

        this.defensePositions = this.getDefensePositions([this.me.x, this.me.y]);
    }
}

function churchTurn() {
    // EMERGENCY DEFENSE CODE
    let visibleEnemies = this.getVisibleRobots().filter(i => i.team != this.me.team);
    if(visibleEnemies.length > 0) { // rush defense
        // assess the threat
        let threats = visibleEnemies;
        if(threats.length > 0) { // attacking threat
            if(this.karbonite >= 25 && this.fuel >= 50) {
                let minDist = 7939;
                let closestThreat = [0,0];
                for(let k = 0; k < threats.length; k++) {
                    let dist = this.distSquared([this.me.x, this.me.y], [threats[k].x, threats[k].y]);
                    if(dist < minDist) {
                        minDist = dist;
                        closestThreat = [threats[k].x, threats[k].y];
                    }
                }
                let choice = this.getSpawnLocation(-1*closestThreat[0], -1*closestThreat[1]);
                if(choice != null) {
                    if(this.defensePositions.length > 0) {
                        let defenseTarget = this.defensePositions.shift();
                        this.signal(this.encodeExactLocation(defenseTarget), 2);
                    }
                    return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
                }
            }
        }
    }

    // SATURATION CODE
    this.homeSaturated = this.nearbyMines.length == 0;
    if (this.fuel >= 50 && this.karbonite >= 10 && !this.homeSaturated) {
        let target = this.nearbyMines.shift();
        let choice = this.getSpawnLocation(target[0], target[1]);
        if (choice) {
            this.signal(this.encodeExactLocation(target), 2);
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        }
    }

    // TURTLE CODE
    let coinflip = this.rand(2);
    if (this.fuel >= 200 && this.karbonite >= 200 && this.defensePositions.length > 0 && this.defensePositions &&
        ((this.fuel >= 300 && this.karbonite >= 300) || coinflip == 1)) {
        let target = [1,0];
        let choice = this.getSpawnLocation(target[0], target[1]);
        if (choice) {
            let defenseTarget = this.defensePositions.shift();
            this.signal(this.encodeExactLocation(defenseTarget), 2);
            if(this.me.turn < 500) {
                return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
            }
            else {
                let decision = this.rand(4);
                if(decision < 2)
                    return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
                else
                    return this.buildUnit(SPECS.CRUSADER, choice[0], choice[1]);
            }
        }
    }
    return;
}
