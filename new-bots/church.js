import {SPECS} from 'battlecode';

export function Church() {
    this.turn = churchTurn;
    this.step = 0;

    let broadcastingPilgrims = this.getVisibleRobots().filter(i => (i.unit == SPECS.PILGRIM) &&
        Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && i.signal>=0);
    this.nearbyMines = [];
    if(!(broadcastingPilgrims.length>0 && broadcastingPilgrims[0].signal == 1)) //it is a mission church!
        this.nearbyMines = this.getNearbyMines();
}

function churchTurn() {
    if (this.fuel >= 50 && this.karbonite >= 10 && this.nearbyMines.length>0) {
        let target = this.nearbyMines.shift();
        let choice = this.getSpawnLocation(target[0], target[1]);
        if (choice != null) {
            this.signal(this.encodeExactLocation(target), 2);
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        }
    }
    return;
}
