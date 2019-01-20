import {SPECS} from 'battlecode';

const CLUSTER = {
    OPEN: 0,
    OTW: 1,
    CONTROLLED: 2,
    FORT: 3,
    HOSTILE: 4
};

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
    this.clusterStatus = this.resourceClusters.map(x => CLUSTER.OPEN); // one for each resource cluster.  status codes:
    // 0: unknown/open; 1: on the way; 2: church/castle built and pilgrims present;
    // 3: fortified and ours; 4: enemy; can add other codes if necessary

    // this.log(this.resourceClusters);

    // identify my cluster
    this.myClusterIndex = this.findNearestClusterIndex([this.me.x, this.me.y], this.resourceClusters);

    this.clusterStatus[this.myClusterIndex] = CLUSTER.CONTROLLED;
    let oppositeClusterIndex = this.reflectClusterByIndex(this.myClusterIndex, this.resourceClusters);
    //this.log("my cluster: "+this.myClusterIndex+"; enemy cluster: "+oppositeClusterIndex);
    this.clusterStatus[oppositeClusterIndex] = CLUSTER.HOSTILE;

    this.nearbyMines = this.resourceClusters[this.myClusterIndex];
    this.homeSaturated = false;
}

/**
 * Function to return the index in this.resourceClusters of the next cluster to send a mission to.
 * Returns -1 if there are no more missions we want to send.
 */
function getNextMissionTarget() {
    let minScore = 7939; // R^2; this is 2*63^2 + 1
    let target = -1;
    let shouldSend = false;
    for (let i = 0; i < this.resourceClusters.length; i++) {
        let d = this.distSquared(this.resourceCentroids[i], [this.me.x, this.me.y]);
        if (this.clusterStatus[i] == CLUSTER.OPEN && d < minScore) {
            let karbThresh = 50 + Math.floor(Math.sqrt(d));
            let fuelThresh = 50 + Math.floor(Math.sqrt(d));
            shouldSend = (this.fuel >= fuelThresh) && (this.karbonite >= karbThresh);
            minScore = d;
            target = i;
        }
    }
    return [target, shouldSend];
}

function castleTurn() {
    //this.log("Castle "+this.me.id+" at ("+this.me.x+","+this.me.y+") here.  Here's what I know about cluster status:");
    //this.log(this.clusterStatus);
    // BEGIN OPENING CASTLETALK CODE
    /*
     * outline of opening protocol
     * step 1:
     *  - castletalk my location
     *  - listen to others locations, add to list
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
    if (this.step == 1) {
        // this.log("Opening started.  Castle "+this.me.id+" at ("+this.me.x+","+this.me.y+") here.");

        // castletalk my location
        this.castleTalk(this.myEncodedLocation);

        // listen to others locations, add to list
        this.otherCastleZoneList.concat(talkingCastles.map(i => i.castle_talk));
        this.otherCastleIDs.concat(talkingCastles.map(i => i.id));
    }
    else if (this.step == 2) {
        // listen to others locations, add to list
        this.otherCastleZoneList.concat(talkingCastles.map(i => i.castle_talk));
        this.otherCastleIDs.concat(talkingCastles.map(i => i.id));
    }
    else if (this.step == 3) {
        // castletalk my mission
        this.castleTalk(this.myClusterIndex);

        // listen to others clusters, mark their status
        let otherCastleClusters = talkingCastles.map(i => i.castle_talk);
        for(let i = 0; i < otherCastleClusters.length; i++) {
            this.clusterStatus[otherCastleClusters[i]] = CLUSTER.CONTROLLED;
            let oppositeClusterIndex = this.reflectClusterByIndex(otherCastleClusters[i], this.resourceClusters);
            this.clusterStatus[oppositeClusterIndex] = CLUSTER.HOSTILE;
        }
    }
    else if (this.step == 4) {
        // listen to others clusters, mark their status
        let otherCastleClusters = talkingCastles.map(i => i.castle_talk);
        for(let i = 0; i < otherCastleClusters.length; i++) {
            this.clusterStatus[otherCastleClusters[i]] = CLUSTER.CONTROLLED;
            let oppositeClusterIndex = this.reflectClusterByIndex(otherCastleClusters[i], this.resourceClusters);
            this.clusterStatus[oppositeClusterIndex] = CLUSTER.HOSTILE;
        }
    }
    else if (this.step == 5) {
        //this.log("Opening complete.  Castle "+this.me.id+" at ("+this.me.x+","+this.me.y+") here.  Clusters we control:");
        //this.log(this.resourceClusters.filter((item, i) => this.clusterStatus[i] == CLUSTER.CONTROLLED));
        let nextMissionTarget = getNextMissionTarget.call(this);
        //this.log("My next mission target:");
        //this.log(this.resourceClusters[nextMissionTarget]);
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
    this.homeSaturated = (this.nearbyMines.length == 0);
    if (this.fuel >= 50 && this.karbonite >= 10 && !this.homeSaturated) {
        let target = this.nearbyMines.shift();
        let choice = this.getSpawnLocation(target[0], target[1]);
        if (choice != null) {
            //this.log("Spawning pilgrim in direction " + choice + " towards " + target);
            this.signal(this.encodeExactLocation(target), 2);
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        }
    }

    // LISTENING CODE
    if(this.step > 4 && talkingCastles.length > 0) {
        for(let i = 0; i < talkingCastles.length; i++) {
            let talk = talkingCastles[i].castle_talk;
            //this.log("I hear "+talk);
            if(0 < talk && talk < 32) { // means it's a mission index
                this.clusterStatus[talk - 1] = CLUSTER.CONTROLLED;
                // this.log("Ah, I see that we are sending a mission to cluster "+(talk-1));
            }
        }
    }

    // NEW MISSION CODE:
    let nextMission = getNextMissionTarget.call(this);
    let targetClusterIndex = nextMission[0];
    let sendingMission = nextMission[1];
    if (this.step > 4 && this.homeSaturated && sendingMission) { // perhaps replace with an actual threshold
        let targetCentroid = this.resourceCentroids[targetClusterIndex];
        let targetCluster = this.resourceClusters[targetClusterIndex];
        let target = targetCluster[0];
        if(this.karbonite_map[targetCentroid[1]][targetCentroid[0]] || this.fuel_map[targetCentroid[1]][targetCentroid[0]])
            target = targetCentroid;
        else {
            for(let i = -1; i <= 1; i++) {
                for(let j = -1; j <= 1; j++) {
                    let newx = targetCentroid[0]+i;
                    let newy = targetCentroid[1]+j;
                    if(newx >= 0 && newx < this.fuel_map.length && newy >= 0 && newy <= this.fuel_map.length &&
                        (this.karbonite_map[newy][newx] || this.fuel_map[newy][newx])) {
                        target = [newx, newy];
                    }
                }
            }
        }

        let choice = this.getSpawnLocation(target[0], target[1]);
        if (choice != null) {
            this.clusterStatus[targetClusterIndex] = CLUSTER.CONTROLLED;
            this.castleTalk(targetClusterIndex + 1);
            this.log("I'm sending a mission to cluster "+targetClusterIndex+" and broadcasting it.");
            //this.log("Spawning pilgrim in direction " + choice + " towards " + target);
            this.signal(this.encodeExactLocation(target), 2);
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        }
    }

    // PUMP PROPHETS CODE
    if (this.fuel >= 400 && this.karbonite >= 100 && targetClusterIndex == -1) { // last condition: dont pump until all missions sent
        let target = [1,0];
        let choice = this.getSpawnLocation(target[0], target[1]);
        if (choice != null) {
            this.signal(this.encodeExactLocation(target), 2);
            return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
        }
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