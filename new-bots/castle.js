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

    this.defensePositions = this.getDefensePositions([this.me.x, this.me.y]);

    this.numCastles = 3;
    this.numPreachersSpawned = 0;
    this.sendHarasser = true;
}

/**
 * Function to return the index in this.resourceClusters of the next cluster to send a mission to.
 * Returns -1 if there are no more missions we want to send.
 */
function getNextMissionTarget() {
    let minScore = 7939; // R^2; this is 2*63^2 + 1
    let target = -1;
    let shouldSend = false;
    let maxSize = 6; // min size threshold for override
    let overrideTarget = -1;
    let shouldSendOverride = false;
    for (let i = 0; i < this.resourceClusters.length; i++) {
        let d = this.distSquared(this.resourceCentroids[i], [this.me.x, this.me.y]);
        if (this.clusterStatus[i] == CLUSTER.OPEN && d < minScore) {
            let karbThresh = 20 + 10*this.clusterStatus.filter(i => i == CLUSTER.CONTROLLED).length + Math.floor(Math.sqrt(d));
            let fuelThresh = 20 + 10*this.clusterStatus.filter(i => i == CLUSTER.CONTROLLED).length + Math.floor(Math.sqrt(d));
            shouldSend = (this.fuel >= fuelThresh) && (this.karbonite >= karbThresh);
            minScore = d;
            target = i;
        }
        if (this.clusterStatus[i] == CLUSTER.OPEN && this.resourceClusters[i].length >= maxSize) { // override the shortest distance if we have big cluster
            let karbThresh = 10 + Math.floor(Math.sqrt(d));
            let fuelThresh = 10 + Math.floor(Math.sqrt(d));
            shouldSendOverride = (this.fuel >= fuelThresh) && (this.karbonite >= karbThresh);
            maxSize = this.resourceClusters[i].length;
            overrideTarget = i;
        }
    }
    if(overrideTarget != -1)
        return [overrideTarget, shouldSendOverride];
    return [target, shouldSend];
}

function castleTurn() {
    // this.log(this.step);
    // this.log("Castle "+this.me.id+" at ("+this.me.x+","+this.me.y+") here, on step "+this.step+".  Here's what I know about cluster status:");
    // this.log(this.clusterStatus);
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
        for(let i=0; i<talkingCastles.length; i++) {
            this.otherCastleZoneList.push(talkingCastles[i].castle_talk);
            this.otherCastleIDs.push(talkingCastles[i].id);
        }
    }
    else if (this.step == 2) {
        // listen to others locations, add to list
        for(let i=0; i<talkingCastles.length; i++) {
            this.otherCastleZoneList.push(talkingCastles[i].castle_talk);
            this.otherCastleIDs.push(talkingCastles[i].id);
        }

        while(this.otherCastleZoneList.length < 2) {
            this.otherCastleZoneList.push(this.myEncodedLocation);
        }
        this.otherCastleLocations = this.otherCastleZoneList[0] + (2**8)*this.otherCastleZoneList[1];
    }
    else if (this.step == 3) {
        // castletalk my mission
        this.castleTalk(this.myClusterIndex+1);
        // this.log("castletalking my cluster: "+this.myClusterIndex);

        // listen to others clusters, mark their status
        let otherCastleClusters = talkingCastles.map(i => i.castle_talk);
        for(let i = 0; i < otherCastleClusters.length; i++) {
            // this.log("I heard a friend at cluster "+(otherCastleClusters[i]-1));
            this.clusterStatus[otherCastleClusters[i]-1] = CLUSTER.CONTROLLED;
            let oppositeClusterIndex = this.reflectClusterByIndex(otherCastleClusters[i]-1, this.resourceClusters);
            this.clusterStatus[oppositeClusterIndex] = CLUSTER.HOSTILE;
        }
    }
    else if (this.step == 4) {
        // listen to others clusters, mark their status
        let otherCastleClusters = talkingCastles.map(i => i.castle_talk);
        for(let i = 0; i < otherCastleClusters.length; i++) {
            // this.log("I heard a friend at cluster "+(otherCastleClusters[i]-1));
            this.clusterStatus[otherCastleClusters[i]-1] = CLUSTER.CONTROLLED;
            let oppositeClusterIndex = this.reflectClusterByIndex(otherCastleClusters[i]-1, this.resourceClusters);
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

    // LISTENING CODE
    if(this.step > 4 && talkingCastles.length > 0) {
        for(let i = 0; i < talkingCastles.length; i++) {
            let talk = talkingCastles[i].castle_talk;
            //this.log("I hear "+talk);
            if(0 < talk && talk < 32) { // means it's a mission index
                this.clusterStatus[talk-1] = CLUSTER.CONTROLLED;
                // this.log("Ah, I see that we are sending a mission to cluster "+(talk-1));
            }
            if(talk == 32) { // means harass is being sent out
                this.sendHarasser = false;
            }
        }
    }

    // EMERGENCY DEFENSE CODE: always attack if enemy is in range
    let visibleEnemies = this.getVisibleRobots().filter(i => i.team != this.me.team);
    if(visibleEnemies.length > 0) { // rush defense
        // assess the threat
        let threats = visibleEnemies.filter(i => i.unit > 2);
        let preacherThreats = threats.filter(i => i.unit == 5);
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
                if(preacherThreats.length > 0 && this.karbonite >= 30) {
                    let choice = this.getSpawnLocation(closestThreat[0], closestThreat[1]);
                    if(choice != null) {
                        if(this.defensePositions.length > 0) {
                            let defenseTarget = this.defensePositions.shift();
                            this.signal(this.otherCastleLocations, 2);
                        }
                        return this.buildUnit(SPECS.PREACHER, choice[0], choice[1]);
                    }
                }
                else {
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
        // if they're just pilgrims, or if we have no $$ to deploy archers
        let attackbot = this.getRobotToAttack();
        if (attackbot) {
            if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
                return this.attack(attackbot.x - this.me.x, attackbot.y - this.me.y);
            }
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
            this.castleTalk(targetClusterIndex+1);
            // this.log("I'm sending a mission to cluster "+targetClusterIndex+" and broadcasting it.");
            //this.log("Spawning pilgrim in direction " + choice + " towards " + target);
            this.signal(this.encodeExactLocation(target), 2);
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        }
    }

    // PUMP PROPHETS CODE
    let coinflip = this.rand(2);
    if (this.fuel >= 200 && this.karbonite >= 200 && this.defensePositions.length > 0 && targetClusterIndex == -1
        && ((this.fuel >= 300 && this.karbonite >= 300) || coinflip == 1)) {
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