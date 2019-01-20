import {SPECS} from 'battlecode';

export function Church() {
    this.turn = churchTurn;
    this.step = 0;

    let broadcastingPilgrims = this.getVisibleRobots().filter(i => (i.unit == SPECS.PILGRIM) &&
        Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && i.signal>=0);

    this.nearbyMines = [];
    if(broadcastingPilgrims.length > 0 && broadcastingPilgrims[0].signal > 0) { //it is a mission church!
        this.resourceClusters = this.clusterResourceTiles();
        this.myClusterIndex = this.findNearestClusterIndex([this.me.x, this.me.y], this.resourceClusters);
        let missionMineLocation = this.decodeExactLocation(broadcastingPilgrims[0].signal);
        this.nearbyMines = this.resourceClusters[this.myClusterIndex].filter(i => !this.arrEq(i, missionMineLocation));
        this.homeSaturated = false;
    }
}

function churchTurn() {
    this.homeSaturated = this.nearbyMines.length == 0;
    if (this.fuel >= 50 && this.karbonite >= 10 && !this.homeSaturated) {
        let target = this.nearbyMines.shift();
        let choice = this.getSpawnLocation(target[0], target[1]);
        if (choice) {
            this.signal(this.encodeExactLocation(target), 2);
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        }
    }
    if (this.fuel >= 60 && this.karbonite >= 30) {
        let target = [1,0];
        let choice = this.getSpawnLocation(target[0], target[1]);
        if (choice) {
            this.signal(this.encodeExactLocation(target), 2);
            return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
        }
    }
    return;
}
