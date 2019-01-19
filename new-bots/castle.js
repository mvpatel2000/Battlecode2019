import {SPECS} from 'battlecode';

export function Castle() {
    this.turn = castleTurn;
    this.step = 0;

    this.reflectedLocation = this.reflectPoint(this.me.x, this.me.y);
    this.myEncodedLocation = this.encodeLocation(this.reflectedLocation[0], this.reflectedLocation[1]);
    this.otherCastleLocations = 0;

    this.alphaCastle = true;
    this.resourceClusters = this.clusterResourceTiles();
    this.resourceCentroids = this.resourceClusters.map(x => this.centroid(x));
    this.clusterStatus = this.resourceClusters.map(x => 0); // one for each resource cluster.  status codes:
    // 0: unknown/open; 1: on the way; 2: church/castle built and pilgrims present;
    // 3: fortified and ours; 4: enemy; can add other codes if necessary

    this.nearbyMines = this.getNearbyMines();
    this.mission = true;
}

/**
 * Function to return the index in this.resourceClusters of the next cluster to send a mission to.
 */
function nextMissionTarget() { // currently assumes that this.isColonized just works, but this is not done yet.
    var openClusters = this.resourceClusters.filter((item, i) => this.clusterStatus[i] == 0);
    var openCentroids = this.resourceCentroids.filter((item, i) => this.clusterStatus[i] == 0);
    let minScore = 7939; // R^2; this is 2*63^2 + 1
    let target = 0;
    for(let i = 0; i < openClusters.length; i++) {
        let d = this.distSquared(openCentroids[i][0], openCentroids[i][1]);
        if(d < minScore) {
            minScore = d;
            target = i;
        }
    }
    return target;
}

function castleTurn() {
    this.step++;
    if (this.step == 1) { // wait for all castles to broadcast
        this.castleTalk(this.myEncodedLocation);
        return;
    }
    else if (this.step == 2) { // get castle locations
        let castles = this.getVisibleRobots().filter(i => i.castle_talk!=0 && i.id != this.me.id).map(i => i.castle_talk);
        while(castles.length < 2) {
            castles.push(this.myEncodedLocation);
        }
        this.otherCastleLocations = castles[0] + (2**8)*castles[1];
        this.castleTalk(this.myEncodedLocation);

        let castleturns = this.getVisibleRobots().filter(i => i.castle_talk!=0 && i.id != this.me.id).map(i => i.turn);
        for(let i=0; i<castleturns.length; i++) {
            if(this.me.turn!=castleturns[i]) {
                this.alphaCastle = false;
            }
        }
    }
    //else if (this.step == 3) { // build first pilgrim and claim first zone
        // let target = nextMissionTarget.call(this);

    // }

    //if(this.alphaCastle == false)
    //    return;

    // let choice = this.randomMove();

    let attackbot = this.getRobotToAttack(); //attack if enemy is in range
    if (attackbot) {
        if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
            return this.attack(attackbot.x - this.me.x, attackbot.y - this.me.y);
        }
    }

    if (this.fuel >= 50 && this.karbonite >= 10 && this.nearbyMines.length>0) {
        let target = this.nearbyMines.shift();
        let choice = this.getSpawnLocation(target[0], target[1]);
        this.log("Castle at ("+this.me.x+","+this.me.y+") spawning pilgrim in direction "+choice+" towards "+target);
        this.signal(this.encodeExactLocation(target), 2);
        return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
    }
    // else if (this.fuel >= 500 && this.karbonite >= 100 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1]) && this.mission) {
    else if (this.fuel >= 500 && this.karbonite >= 100 && this.mission) {
        //this.signal(this.encodeExactLocation(this.nearbyMines.shift()), 2);
        this.mission = false;
        //return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
    }

    return; 

    // if you have enough for mission 
        // determine which mission to go to
        // launch mission
        // communicate to other churches mission is built

//Notes: Each pilgrim should comm back its tile its at (indicating alive) or under attack
//       Each church should continuously say alive & if still saturating, saturated, or under attack

//     if (this.prophet < 3 && this.fuel >= 50 && this.karbonite >= 30 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1])) {
//         this.signal(this.otherCastleLocations, 2);
//         this.prophet++;
//         return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
//     }

}