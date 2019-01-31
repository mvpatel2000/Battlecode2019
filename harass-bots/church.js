import {SPECS} from 'battlecode';

export function Church() {
    this.turn = churchTurn;
    this.step = 0;
    this.freed = [];

    let broadcastingPilgrims = this.getVisibleRobots().filter(i => (i.unit == SPECS.PILGRIM) && (i.team == this.me.team) &&
        Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && this.decrypt(i.signal)>=0);
    let zeroBroadcast = broadcastingPilgrims.filter(i => this.decrypt(i.signal) == 0);

    this.nearbyMines = [];
    this.nearbyMineCounts = [];
    this.defensePositions = [];
    this.lateGameChurch = true;
    this.resourceClusters = this.clusterResourceTiles();
    this.myClusterIndex = this.findNearestClusterIndex([this.me.x, this.me.y], this.resourceClusters);

    this.aggroChurch = false;
    this.closestThreat = [0,0];

    if (broadcastingPilgrims.length > 0 && zeroBroadcast.length == 0) { //it is a mission or aggro church!

        this.lateGameChurch = false;

        this.defensePositions = this.getDefensePositions([this.me.x, this.me.y]);

        this.makeDense = false;
        this.numEmergencies = 0;
        this.extendedDefenseTimer = 0;

        if(this.decrypt(broadcastingPilgrims[0].signal) == 0xdddd) {
            this.aggroChurch = true;
            this.log("i am an aggro church");
        }
        else {
            let missionMineLocation = this.decodeExactLocation(this.decrypt(broadcastingPilgrims[0].signal));
            this.nearbyMines = this.resourceClusters[this.myClusterIndex];
            let karbMines = this.nearbyMines.filter(i => this.karbonite_map[i[1]][i[0]] == true);
            let fuelMines = this.nearbyMines.filter(i => this.fuel_map[i[1]][i[0]] == true);
            this.nearbyMines = karbMines;
            for (let fuelctr = 0; fuelctr < fuelMines.length; fuelctr++)
                this.nearbyMines.push(fuelMines[fuelctr]);

            this.nearbyMineCounts = this.nearbyMines.map(i => 100);
            for (let minectr = 0; minectr < this.nearbyMines.length; minectr++) {
                if (this.arrEq(this.nearbyMines[minectr], missionMineLocation)) {
                    this.nearbyMineCounts[minectr] = 0;
                    break;
                }
            }
            this.homeSaturated = false;
        }
    }
}

function churchTurn() {
    this.checkFreed();
    if (this.endgameAnalysis()) { //last second resource liquidation
        let choice = this.getSpawnLocation(this.me.x + 1, this.me.y);
        if (choice != null) {
            if (this.fuel >= 50 && this.karbonite >= 10) {
                this.signal(this.encrypt(0), 2);
                return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
            }
        }
    }

    if (this.lateGameChurch)
        return;

    if(this.aggroChurch) {

    }
    // MINING UPDATE CODE
    this.nearbyMineCounts = this.nearbyMineCounts.map(i => i+1);
    let signalPilgrims = this.getVisibleRobots().filter(i => i.unit == 2 && this.decrypt(i.signal) >=0);
    for (let pilgrimCtr = 0; pilgrimCtr<signalPilgrims.length; pilgrimCtr++) {
        let pilgrimLocation = this.decodeExactLocation(this.decrypt(signalPilgrims[pilgrimCtr].signal));
        for (let mineCtr = 0; mineCtr < this.nearbyMines.length; mineCtr++) {
            if (this.arrEq(pilgrimLocation, this.nearbyMines[mineCtr])) {
                if (Math.floor(this.decrypt(signalPilgrims[pilgrimCtr].signal) / 64 / 64) % 2 == 1) {
                    this.nearbyMineCounts[mineCtr] = -999; //stop tracking it, it reports to new base
                }
                else if (Math.abs(signalPilgrims[pilgrimCtr].x - this.me.x) <= 1 && Math.abs(signalPilgrims[pilgrimCtr].y - this.me.y) <= 1) {
                    this.nearbyMineCounts[mineCtr] = 0;
                }
                break;
            }
        }
    }

    // EMERGENCY DEFENSE CODE: always attack if enemy is in range
    let visibleEnemies = this.getVisibleRobots().filter(i => i.team != this.me.team);
    if (visibleEnemies.length > 0 || this.extendedDefenseTimer > 0) { // rush defense
        // assess the threat
        let threats = visibleEnemies.filter(i => i.unit > 2 || i.unit < 2);
        let prophetThreats = threats.filter(i => i.unit == 4); //counts number of prophets
        if (threats.length > 0 || this.extendedDefenseTimer > 0) { // attacking threat
            if (this.karbonite >= 30 && this.fuel >= 50) {
                let minDist = 7939;
                for (let k = 0; k < threats.length; k++) {
                    let dist = this.distSquared([this.me.x, this.me.y], [threats[k].x, threats[k].y]);
                    if (dist < minDist) {
                        minDist = dist;
                        this.closestThreat = [threats[k].x, threats[k].y];
                    }
                }
                if (prophetThreats.length == 0 && threats.length > 0) { //build preachers unless you see 2 prophets
                    let choice = this.getSpawnLocation(this.closestThreat[0], this.closestThreat[1]);
                    if (choice != null) {
                        if (this.defensePositions.length > 0) {
                            let sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
                            let angle = (v, w) => Math.acos(
                                (v[0] * w[0] + v[1] * w[1]) / (Math.sqrt(v[0] * v[0] + v[1] * v[1])
                                    * Math.sqrt(w[0] * w[0] + w[1] * w[1])));
                            let candidates = this.defensePositions.filter(i =>
                                angle(sub(i, this.pos()), sub(this.closestThreat, this.pos())) <= Math.PI / 4)
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
                else {
                    let choice = this.getSpawnLocation(this.closestThreat[0], this.closestThreat[1]);
                    if (choice != null) {
                        if (this.defensePositions.length > 0) {
                            let sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
                            let angle = (v, w) => Math.acos(
                                (v[0] * w[0] + v[1] * w[1]) / (Math.sqrt(v[0] * v[0] + v[1] * v[1])
                                    * Math.sqrt(w[0] * w[0] + w[1] * w[1])));
                            let candidates = this.defensePositions.filter(i =>
                                angle(sub(i, this.pos()), sub(this.closestThreat, this.pos())) <= Math.PI / 4)
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
        else if (this.karbonite >= 25 && this.fuel >= 50
            && this.distSquared([visibleEnemies[0].x, visibleEnemies[0].y],[this.me.x, this.me.y]) >= 25) {
            this.closestThreat = [visibleEnemies[0].x, visibleEnemies[0].y]
            let choice = this.getSpawnLocation(this.closestThreat[0], this.closestThreat[1]);
            if (choice != null) {
                if (this.defensePositions.length > 0) {
                    let sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
                    let angle = (v, w) => Math.acos(
                        (v[0] * w[0] + v[1] * w[1]) / (Math.sqrt(v[0] * v[0] + v[1] * v[1])
                            * Math.sqrt(w[0] * w[0] + w[1] * w[1])));
                    let candidates = this.defensePositions.filter(i =>
                        angle(sub(i, this.pos()), sub(this.closestThreat, this.pos())) <= Math.PI / 4)
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
                return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
            }
        }
        else if (this.karbonite >= 15 && this.fuel >= 50) {
            this.closestThreat = [visibleEnemies[0].x, visibleEnemies[0].y]
            let choice = this.getSpawnLocation(this.closestThreat[0], this.closestThreat[1]);
            if (choice != null) {
                if (this.defensePositions.length > 0) {
                    let sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
                    let angle = (v, w) => Math.acos(
                        (v[0] * w[0] + v[1] * w[1]) / (Math.sqrt(v[0] * v[0] + v[1] * v[1])
                            * Math.sqrt(w[0] * w[0] + w[1] * w[1])));
                    let candidates = this.defensePositions.filter(i =>
                        angle(sub(i, this.pos()), sub(this.closestThreat, this.pos())) <= Math.PI / 4)
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
                return this.buildUnit(SPECS.CRUSADER, choice[0], choice[1]);
            }
        }
    }

    this.homeSaturated = this.nearbyMineCounts.filter(i => i>=20).length == 0;
    if (this.fuel >= 50 && this.karbonite >= 10 && !this.homeSaturated) {
        let target = [this.me.x, this.me.y];
        for (let mineCtr = 0; mineCtr < this.nearbyMines.length; mineCtr++) { //finds empty mining location
            if (this.nearbyMineCounts[mineCtr] >= 20) {
                target = this.nearbyMines[mineCtr];
                this.nearbyMineCounts[mineCtr] = 0;
                //this.log("Spawning pilgrim in direction "+target+" count: "+this.nearbyMineCounts[mineCtr]);
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

    // TURTLE CODE
    return this.pumpProphets();
}
