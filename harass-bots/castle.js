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
    this.freed = [];

    this.enemyCastleZoneList = []; //only used for harassers
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
    this.doppelganger = this.reflectClusterByIndex(this.myClusterIndex, this.resourceClusters);
    //this.log("my cluster: "+this.myClusterIndex+"; enemy cluster: "+oppositeClusterIndex);
    this.clusterStatus[this.doppelganger] = CLUSTER.HOSTILE;

    this.nearbyMines = this.resourceClusters[this.myClusterIndex];
    let karbMines = this.nearbyMines.filter(i => this.karbonite_map[i[1]][i[0]] == true);
    let fuelMines = this.nearbyMines.filter(i => this.fuel_map[i[1]][i[0]] == true);
    this.nearbyMines = karbMines;
    for(let fuelctr = 0; fuelctr < fuelMines.length; fuelctr++)
        this.nearbyMines.push(fuelMines[fuelctr]);

    this.nearbyMineCounts = this.nearbyMines.map(i => 100);
    this.homeSaturated = false;

    this.defensePositions = this.getDenseDefensePositions([this.me.x, this.me.y]);

    this.numCastles = 3;
    this.numPreachersSpawned = 0;
    this.sendHarasser = 1;

    //only used for harassers
    this.sendHarasser = 1;
    this.numHarassersSent = 0;
    this.maximumHarassers = -1;
    this.myMaximumHarassers = 0;
    this.queue = [];
    this.bestClusters = [];
    this.hostile = 0;
    this.harassSignal = 1<<15;
    this.mycastle = Infinity;
    this.hostileSignal = 1<<15;
    //end only used for harassers

    this.hp = this.me.health;

    this.numCastles = 0;
    this.numCastlesAlive = 0;
    this.hasPushed = false;

    this.contestedTimer = -100;
    this.numEmergencies = 0;
    this.extendedDefenseTimer = 0;

    this.log(this.decodeExactLocation(this.decrypt('47196')));
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
            let karbThresh = 20 + 5*this.clusterStatus.filter(i => i == CLUSTER.CONTROLLED).length + Math.floor(Math.sqrt(d));
            let fuelThresh = 20 + 5*this.clusterStatus.filter(i => i == CLUSTER.CONTROLLED).length + Math.floor(Math.sqrt(d));
            shouldSend = (this.fuel >= fuelThresh) && (this.karbonite >= karbThresh);
            minScore = d;
            target = i;
        }
        if (this.clusterStatus[i] == CLUSTER.OPEN && this.resourceClusters[i].length >= maxSize) { // override the shortest distance if we have big cluster
            let karbThresh = 20 + 0.6*Math.floor(Math.sqrt(d));
            let fuelThresh = 20 + 0.6*Math.floor(Math.sqrt(d));
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

    if (this.step % 50 == 0) {
        this.log(`Turn: ${this.step}`);
    }
    this.step++;
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
    this.checkFreed();
    let talkingCastles = this.getVisibleRobots().filter(i => i.castle_talk!=0 && i.id != this.me.id);
    this.numCastlesAlive = talkingCastles.length + 1;
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
        //for harrasers
        this.enemyCastleZoneList = this.otherCastleZoneList.map(i => i);
        this.enemyCastleZoneList.push(this.myEncodedLocation);
        //end for harassers

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

        this.numCastles = this.clusterStatus.filter(i => i == CLUSTER.HOSTILE).length;
        this.numCastlesAlive = this.numCastles;
    }
    else if (this.step >= 5) {
        this.castleTalk(0xaa);
    }
    if (this.step == 999) {
        let message = this.encrypt(0x5000);
        let dist = ([this.me.x, this.me.y, this.map.length - this.me.x, this.map.length - this.me.y]
                            .reduce((a, b) => a < b ? b : a) * Math.sqrt(2)) ** 2;
        this.log(`endgame; message = ${message.toString(2)}, dist = ${Math.floor(dist)}`);
        this.signal(message, Math.floor(dist));
        return;
    }
    // END OPENING CASTLETALK CODE

    // **************************************************
    // ************NEVER RETURN BEFORE THESE TWO*********
    // ****************UPDATE FUNCTIONS******************
    // **************************************************
    // MINING UPDATE CODE
    this.nearbyMineCounts = this.nearbyMineCounts.map(i => i+1);
    let signalPilgrims = this.getVisibleRobots().filter(i => i.unit == 2 && this.decrypt(i.signal) >=0);
    for(let pilgrimCtr = 0; pilgrimCtr<signalPilgrims.length; pilgrimCtr++) {
        let pilgrimLocation = this.decodeExactLocation(this.decrypt(signalPilgrims[pilgrimCtr].signal));
        for(let mineCtr = 0; mineCtr < this.nearbyMines.length; mineCtr++) {
            if(this.arrEq(pilgrimLocation, this.nearbyMines[mineCtr])) {
                if(Math.floor(this.decrypt(signalPilgrims[pilgrimCtr].signal) / 64 / 64) % 2 == 1) {
                    this.nearbyMineCounts[mineCtr] = -999; //stop tracking it, it reports to new base
                }
                else if(Math.abs(signalPilgrims[pilgrimCtr].x - this.me.x) <= 1 && Math.abs(signalPilgrims[pilgrimCtr].y - this.me.y) <= 1) {
                    this.nearbyMineCounts[mineCtr] = 0;
                }
                break;
            }
        }
    }

    // LISTENING CODE
    if(this.step > 4 && talkingCastles.length > 0) {
        for(let i = 0; i < talkingCastles.length; i++) {
            let talk = talkingCastles[i].castle_talk;
            //this.log("I hear "+talk);
            if(0 < talk && talk < 32) { // means it's a mission index
                this.clusterStatus[talk-1] = CLUSTER.CONTROLLED;
                //this.log("Ah, I see that we are sending a mission to cluster "+(talk-1));
            }
        }
    }
    // ***********************************************
    // ***END MINING AND LISTENING CODE***************
    // ***********************************************


    // ***************************************
    // *************BEGIN HARASS CODE*********
    // ***************************************
    // Do initial computation.
    if (this.step == 3) {
        //get enemy castle and friendly castle [x,y] locations
        let enemyCastleLocations = [];
        let friendlyCastleLocations = [];

        for (let c = 0; c < this.enemyCastleZoneList.length; c++) {
            //this.log("zone list " + this.enemyCastleZoneList[c]);
            let enemyloc = this.decodeLocation(this.enemyCastleZoneList[c]);
            //this.log("enemyloc " + enemyloc);
            let myloc = this.reflectPoint(enemyloc[0], enemyloc[1]);
            enemyCastleLocations.push(enemyloc);
            friendlyCastleLocations.push(myloc);
        }

        //this.log("Castle Zone List: " + this.enemyCastleZoneList)
        //this.log("The total number of castles on my team is " + friendlyCastleLocations.length);
        //this.log(this.resourceCentroids);

        //figure out which castle is me
        let mincastledist = Infinity;
        for (let fc = 0; fc < friendlyCastleLocations.length; fc++) {
            let m = this.dist([this.me.x, this.me.y], friendlyCastleLocations[fc])
            if(m < mincastledist) {
                mincastledist = m;
                this.mycastle = fc;
            }
        }
        //Information assymmetry:
        //Put in my location exactly, and the reflected enemy castle location
        //exactly.
        friendlyCastleLocations[this.mycastle][0] = this.me.x;
        friendlyCastleLocations[this.mycastle][1] = this.me.y;
        enemyCastleLocations[this.mycastle] = this.reflectPoint(friendlyCastleLocations[this.mycastle][0], friendlyCastleLocations[this.mycastle][1]);

        //filter out all all of my clusters, keep enemy ones
        this.queue = this.resourceCentroids.filter(i =>
            enemyCastleLocations.map(q => this.dist(q, i)).reduce((a, b) => a + b)
            <= friendlyCastleLocations.map(q => this.dist(q, i)).reduce((a, b) => a + b) + 4);
        this.queue = this.queue.filter(i => enemyCastleLocations.every(l => this.dist(l, i) > 10));
        this.log(this.queue);
        for (let i=0; i < this.queue.length; i++) {
            let minfriendlycastledist = Infinity;
            let minenemycastledist = Infinity;
            for (let j=0; j<friendlyCastleLocations.length; j++) {
                let df = this.dist(friendlyCastleLocations[j], this.queue[i]);
                let de = this.dist(enemyCastleLocations[j], this.queue[i]);
                if(df < minfriendlycastledist) {
                    minfriendlycastledist = df;
                }
                if(de < minenemycastledist) {
                    minenemycastledist = de;
                }
            }
            //this.log(this.queue[i] + " " + minfriendlycastledist);
            //this.log(this.queue[i] + " " + minenemycastledist);
            //if ((minfriendlycastledist - minenemycastledist) > 15) {
                //this.log("removing cluster at " + this.queue[i]);
            //    this.queue.splice(i, 1);
            //    i-=1;
            //}
        }
        this.maximumHarassers = Math.min(this.queue.length, 3);
        this.log(this.queue);
        //write the hostile enemy clusters that cannot be inferred
        //by a unit i send out.
        //that is, they are not nearest to the enemy reflection of this castle
        for (let e = 0; e < enemyCastleLocations.length; e++) {
            if(e == this.mycastle) {
                continue;
            }
            let host = this.findNearestClusterIndex(enemyCastleLocations[e], this.resourceClusters);
            this.harassSignal += (host & 0x1f) << 5 * this.hostile;
            this.hostileSignal = this.harassSignal;
            this.hostile += 1;
        }

        //find the castle with the nearest enemy cluster.
        //each element of bestClusters is of form [distance^2, castle, clusterIndex]
        for (let i=0; i < this.queue.length; i++) {
            let mymindist = Infinity;
            let mymincastle = -1;
            for (let j=0; j < friendlyCastleLocations.length; j++) {
                let dd = this.dist(this.queue[i], friendlyCastleLocations[j]);
                if (dd < mymindist) {
                    mymindist = dd;
                    mymincastle = j;
                }
            }
            this.bestClusters.push([mymindist, mymincastle, i]);
        }

        this.bestClusters.sort(function(a,b){return a[0] - b[0];});
        //if this castle is the one closest to the nearest enemy cluster
        for (let i=0; i < this.maximumHarassers; i++) {
            if (this.mycastle == this.bestClusters[i][1]) {
                this.myMaximumHarassers += 1;
            }
        }
    }

    // HARASS CODE
    // Actually perform the harassing
    if (this.step > 2 && this.sendHarasser == 1 && this.fuel > 50 && this.karbonite > 25 && this.clusterStatus.length <= 32) {
        let target = [1,0];
        let optimalCluster = -1;

        //this.log("I am considering harassing...");

        //find the optimalCluster - the best one in bestClusters that pertains to this castle
        //that has not already been sent (alreadySent skips the already sent prophets).
        let alreadySent = 0;
        for (let i=0; i < this.maximumHarassers; i++) {
            if (this.mycastle == this.bestClusters[i][1]) {
                //this.log("Considering cluster: " + this.queue[i]);
                if(alreadySent < this.numHarassersSent) {
                    alreadySent += 1;
                    //this.log("SKipping cluster: " + this.queue[i]);
                    continue;
                }
                for (let j=0; j < this.resourceCentroids.length; j++) {
                    if (this.resourceCentroids[j][0] == this.queue[this.bestClusters[i][2]][0] && this.resourceCentroids[j][1] == this.queue[this.bestClusters[i][2]][1]) {
                        optimalCluster = j;
                        break;
                    }
                }
            }
            if(optimalCluster != -1) {
                break;
            }
        }

        if(optimalCluster == -1) {
            //i am not the closest castle to the nearest enemy cluster
            //this.log("I have decided not to harass :(");
            this.sendHarasser = 0;
            return;
        } else {
            //this.log("I think there are: " + hostile + " hostile clusters.")
            while (this.hostile < 2) {
                //this.log("adding all 1s");
                this.harassSignal += 0x1f << 5 * this.hostile;
                this.hostileSignal = this.harassSignal;
                this.hostile += 1;
            }
            let choice = this.getSpawnLocation(this.resourceCentroids[optimalCluster][0], this.resourceCentroids[optimalCluster][1]);
            if(this.hostile==2 & choice != null) {
                //this.log("I am a castle at: " + this.me.x + " " + this.me.y + " sending a harasser prophet to enemy cluster: " + this.resourceCentroids[optimalCluster]);
                this.harassSignal += (optimalCluster & 0x1f) << 5 * this.hostile;
                //this.log("I am a castle, I am sending a harasser prophet to this location.");
                this.signal(this.encrypt(this.harassSignal), 2);
                this.numHarassersSent += 1;
                this.harassSignal = this.hostileSignal; // reset harass signal
                return this.buildUnit(SPECS.CRUSADER, choice[0], choice[1]);
            } else {
                this.harassSignal = this.hostileSignal; // reset harass signal
                //this.log("Resetting harass signal, choice was null...");
            }
        }
    }
    // ***************************************
    // *************END HARASS CODE***********
    // ***************************************

    // LOCAL PUSH
    if(this.me.health != this.hp) {
        this.hp = this.me.health;
        if(this.getVisibleRobots().filter(i => i.unit > 2 && i.team == this.me.team).length >= 10) { //require 10 ally units
            let enemyCastleLocations = [];
            for (let c = 0; c < this.enemyCastleZoneList.length; c++) {
                let enemyloc = this.decodeLocation(this.enemyCastleZoneList[c]);
                enemyCastleLocations.push(enemyloc);
            }
            let message = this.encodeExactLocation(enemyCastleLocations.reduce(
                                                (a,b) => this.distSquared(a, this.pos())
                                                < this.distSquared(b, this.pos()) ? a : b)) | 0x7000;
            let dist = 100;
            //this.log(`local pushing; message = ${message.toString(2)}, dist = ${Math.floor(dist)}`);
            this.signal(this.encrypt(message), Math.floor(dist));
            this.updateDefensePositions([this.me.x, this.me.y]);
        }
    }

    // PUSHING
    if (this.me.turn >= 800 && this.numCastlesAlive < this.numCastles && !this.hasPushed
            && this.getVisibleRobots().filter(i => (this.decrypt(i.signal) >> 12) == 0x7).length == 0) {
        this.hasPushed = true;
        let enemyCastleLocations = [];
        for (let c = 0; c < this.enemyCastleZoneList.length; c++) {
            let enemyloc = this.decodeLocation(this.enemyCastleZoneList[c]);
            enemyCastleLocations.push(enemyloc);
        }
        let message = this.encodeExactLocation(enemyCastleLocations.reduce(
                                            (a,b) => this.distSquared(a, this.pos())
                                            < this.distSquared(b, this.pos()) ? a : b)) | 0x7000;
        let dist = ([this.me.x, this.me.y, this.map.length - this.me.x, this.map.length - this.me.y]
                            .reduce((a, b) => a < b ? b : a) * Math.sqrt(2)) ** 2;
        //this.log(`pushing; message = ${message.toString(2)}, dist = ${Math.floor(dist)}`);
        this.signal(this.encrypt(message), Math.floor(dist));
        this.updateDefensePositions([this.me.x, this.me.y]);
    }

    // EMERGENCY DEFENSE CODE: always attack if enemy is in range
    let visibleEnemies = this.getVisibleRobots().filter(i => i.team != this.me.team);
    if(visibleEnemies.length > 0 || this.extendedDefenseTimer > 0) { // rush defense
        // assess the threat
        let threats = visibleEnemies.filter(i => i.unit > 2 || i.unit < 2);
        let prophetThreats = threats.filter(i => i.unit == 4); //counts number of prophetss
        if(threats.length > 0 || this.extendedDefenseTimer > 0) { // attacking threat
            if(this.karbonite >= 30 && this.fuel >= 50 && (this.unitsBuilt < 25 || this.fuel >= 5000)) {
                let minDist = 7939;
                let closestThreat = [0,0];
                for(let k = 0; k < threats.length; k++) {
                    let dist = this.distSquared([this.me.x, this.me.y], [threats[k].x, threats[k].y]);
                    if(dist < minDist) {
                        minDist = dist;
                        closestThreat = [threats[k].x, threats[k].y];
                    }
                }
                if(prophetThreats.length == 0 && threats.length > 0) { //build preachers unless you see prophets
                    let choice = this.getSpawnLocation(closestThreat[0], closestThreat[1]);
                    if(choice != null) {
                        if(this.defensePositions.length > 0) {
                            let sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
                            let angle = (v, w) => Math.acos(
                                (v[0] * w[0] + v[1] * w[1]) / (Math.sqrt(v[0] * v[0] + v[1] * v[1])
                                    * Math.sqrt(w[0] * w[0] + w[1] * w[1])));
                            let candidates = this.defensePositions.filter(i =>
                                angle(sub(i, this.pos()), sub(closestThreat, this.pos())) <= Math.PI / 4)
                            let defenseTarget = candidates[0];
                            for (let i = 0; i < this.defensePositions.length; i++) {
                                if (this.arrEq(this.defensePositions[i], defenseTarget)) {
                                    this.freed.push(this.defensePositions[i]);
                                    this.defensePositions.splice(i, 1);
                                    break;
                                }
                            }
                            this.signal(this.encrypt(this.encodeExactLocation(defenseTarget)), 2);
                        }
                        this.unitsBuilt++;
                        this.numEmergencies++;
                        if(this.numEmergencies == 1) this.extendedDefenseTimer = 1;
                        else this.extendedDefenseTimer = 3;
                        return this.buildUnit(SPECS.PREACHER, choice[0], choice[1]);
                    }
                }
                else { // build prophets
                    let choice = this.getSpawnLocation(closestThreat[0], closestThreat[1]);
                    if(choice != null) {
                        if(this.defensePositions.length > 0) {
                            let sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
                            let angle = (v, w) => Math.acos(
                                (v[0] * w[0] + v[1] * w[1]) / (Math.sqrt(v[0] * v[0] + v[1] * v[1])
                                    * Math.sqrt(w[0] * w[0] + w[1] * w[1])));
                            let candidates = this.defensePositions.filter(i =>
                                angle(sub(i, this.pos()), sub(closestThreat, this.pos())) <= Math.PI / 4)
                            let defenseTarget = candidates[0];
                            for (let i = 0; i < this.defensePositions.length; i++) {
                                if (this.arrEq(this.defensePositions[i], defenseTarget)) {
                                    this.freed.push(this.defensePositions[i]);
                                    this.defensePositions.splice(i, 1);
                                    break;
                                }
                            }
                            this.signal(this.encrypt(this.encodeExactLocation(defenseTarget)), 2);
                        }
                        this.unitsBuilt++;
                        if(threats.length > 0) { // actual emergency defense
                            this.numEmergencies++;
                            if(this.numEmergencies == 1) this.extendedDefenseTimer = 1;
                            else this.extendedDefenseTimer = 3;
                        }
                        else { // extended emergency defense
                            this.extendedDefenseTimer--;
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
    this.homeSaturated = this.nearbyMineCounts.filter(i => i>=20).length == 0;
    if (this.fuel >= 50 && this.karbonite >= 10 && !this.homeSaturated) {
        let target = [this.me.x, this.me.y];
        for (let mineCtr = 0; mineCtr < this.nearbyMines.length; mineCtr++) { //finds empty mining location
            if(this.nearbyMineCounts[mineCtr] >= 20) {
                target = this.nearbyMines[mineCtr];
                this.nearbyMineCounts[mineCtr] = 0;
                break;
            }
        }
        let choice = this.getSpawnLocation(target[0], target[1]);
        if (choice != null) {
            //this.log("Spawning pilgrim in direction " + choice + " towards " + target);
            this.signal(this.encrypt(this.encodeExactLocation(target)), 2);
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
        // let target = targetCluster[0];
        // if(this.karbonite_map[targetCentroid[1]][targetCentroid[0]] || this.fuel_map[targetCentroid[1]][targetCentroid[0]])
        //     target = targetCentroid;
        // else {
        //     for(let i = -1; i <= 1; i++) {
        //         for(let j = -1; j <= 1; j++) {
        //             let newx = targetCentroid[0]+i;
        //             let newy = targetCentroid[1]+j;
        //             if(newx >= 0 && newx < this.fuel_map.length && newy >= 0 && newy <= this.fuel_map.length &&
        //                 (this.karbonite_map[newy][newx] || this.fuel_map[newy][newx])) {
        //                 target = [newx, newy];
        //             }
        //         }
        //     }
        // }

        let choice = this.getSpawnLocation(targetCentroid[0], targetCentroid[1]);
        if (choice != null) {
            this.clusterStatus[targetClusterIndex] = CLUSTER.CONTROLLED;
            this.castleTalk(targetClusterIndex+1);
            // this.log("I'm sending a mission to cluster "+targetClusterIndex+" and broadcasting it.");
            //this.log("Spawning pilgrim in direction " + choice + " towards " + target);

            let enemyCastleClusterCodes = [];
            for(let i = 0; i < this.clusterStatus.length; i++) {
                if(this.clusterStatus[i] == CLUSTER.HOSTILE && i != this.doppelganger) {
                    enemyCastleClusterCodes.push(i);
                }
            }
            while(enemyCastleClusterCodes.length < 2) {
                enemyCastleClusterCodes.push(this.doppelganger);
            }
            //this.log(enemyCastleClusterCodes);

            let signal = (1 << 15) + (targetClusterIndex << 10) + (enemyCastleClusterCodes[0] << 5) + enemyCastleClusterCodes[1];

            //this.log(signal);

            this.signal(this.encrypt(signal), 2);
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        }
    }

    this.targetClusterIndex = targetClusterIndex;

    // PUMP PROPHETS CODE
    return this.pumpProphets();

}
