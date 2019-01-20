import {SPECS} from 'battlecode';

export function Castle() {
    this.turn = castleTurn;
    this.step = 0;

    this.reflectedLocation = this.reflectPoint(this.me.x, this.me.y);
    this.myEncodedLocation = this.encodeLocation(this.reflectedLocation[0], this.reflectedLocation[1]);
    this.otherCastleLocations = 0;
    this.otherCastleZoneList = [];
    this.otherCastleIDs = [];

    this.resourceClusters = this.clusterResourceTiles();
    this.resourceCentroids = this.resourceClusters.map(x => this.centroid(x));
    this.clusterStatus = this.resourceClusters.map(x => 0); // one for each resource cluster.  status codes:
    // 0: unknown/open; 1: on the way; 2: church/castle built and pilgrims present;
    // 3: fortified and ours; 4: enemy; can add other codes if necessary
    this.myCluster = 0;

    this.nearbyMines = this.getNearbyMines();
    this.mission = true;
}

/**
 * Function to return the index in this.resourceClusters of the next cluster to send a mission to.
 */
function getNextMissionTarget() {
    let minScore = 7939; // R^2; this is 2*63^2 + 1
    let target = 0;
    for(let i = 0; i < this.resourceClusters.length; i++) {
        let d = this.distSquared(this.resourceCentroids[i], [this.me.x, this.me.y]);
        if(this.clusterStatus[i] == 0 && d < minScore) {
            minScore = d;
            target = i;
        }
    }
    return target;
}

function castleTurn() {
    // BEGIN OPENING CASTLETALK CODE
    /*
     * outline of opening protocol
     * step 1:
     *  - castletalk my location
     *  - listen to others locations, add to list
     *  - identify my cluster
     * step 2:
     *  - listen to others locations, add to list
     * step 3:
     *  - castletalk my cluster
     *  - listen to others clusters
     * step 4:
     *  - listen to others clusters
     */
    this.step++;
    let talkingCastles = this.getVisibleRobots().filter(i => i.castle_talk!=0 && i.id != this.me.id);
    if(this.step == 1) {
        // this.log("Opening started.  Castle "+this.me.id+" at ("+this.me.x+","+this.me.y+") here.");

        // castletalk my location
        this.castleTalk(this.myEncodedLocation);

        // listen to others locations, add to list
        this.otherCastleZoneList.concat(talkingCastles.map(i => i.castle_talk));
        this.otherCastleIDs.concat(talkingCastles.map(i => i.id));

        // identify my cluster
        this.myCluster = getNextMissionTarget.call(this);
        this.clusterStatus[this.myCluster] = 2;
        // TODO: set opposite cluster to enemy status, so we don't try to take it
    }
    else if(this.step == 2) {
        // listen to others locations, add to list
        this.otherCastleZoneList.concat(talkingCastles.map(i => i.castle_talk));
        this.otherCastleIDs.concat(talkingCastles.map(i => i.id));
    }
    else if(this.step == 3) {
        // castletalk my mission
        this.castleTalk(this.myCluster);

        // listen to others clusters, mark their status
        let otherCastleClusters = talkingCastles.map(i => i.castle_talk);
        for(let i = 0; i < otherCastleClusters.length; i++) {
            this.clusterStatus[otherCastleClusters[i]] = 2;
        }
    }
    else if(this.step == 4) {
        // listen to others clusters, mark their status
        let otherCastleClusters = talkingCastles.map(i => i.castle_talk);
        for(let i = 0; i < otherCastleClusters.length; i++) {
            this.clusterStatus[otherCastleClusters[i]] = 2;
            // TODO: set opposite cluster to enemy status, so we don't try to take it
        }
    }
    else if(this.step == 5) {
        this.log("Opening complete.  Castle "+this.me.id+" at ("+this.me.x+","+this.me.y+") here.  Clusters we control:");
        this.log(this.resourceClusters.filter((item, i) => this.clusterStatus[i] == 2));
        let nextMissionTarget = getNextMissionTarget.call(this);
        this.log("My next mission target:");
        this.log(this.resourceClusters[nextMissionTarget]);
    }
    // END OPENING CASTLETALK CODE

    // ATTACK CODE: always attack if enemy is in range
    let attackbot = this.getRobotToAttack();
    if (attackbot) {
        if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
            return this.attack(attackbot.x - this.me.x, attackbot.y - this.me.y);
        }
    }

    // SATURATE CODE: saturate my nearby mines
    if (this.fuel >= 50 && this.karbonite >= 10 && this.nearbyMines.length>0) {
        let target = this.nearbyMines.shift();
        let choice = this.getSpawnLocation(target[0], target[1]);
        if(choice) {
            this.log("Castle at ("+this.me.x+","+this.me.y+") spawning pilgrim in direction "+choice+" towards "+target);
            this.signal(this.encodeExactLocation(target), 2);
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        }
    }

    // NEW MISSION CODE: currently nonexistent

    // // else if (this.fuel >= 500 && this.karbonite >= 100 && !this.occupied(this.me.x + choice[0], this.me.y + choice[1]) && this.mission) {
    // else if (this.fuel >= 500 && this.karbonite >= 100 && this.mission) {
    //     //this.signal(this.encodeExactLocation(this.nearbyMines.shift()), 2);
    //     this.mission = false;
    //     //return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
    // }

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