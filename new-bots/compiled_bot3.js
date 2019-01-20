'use strict';

var SPECS = {"COMMUNICATION_BITS":16,"CASTLE_TALK_BITS":8,"MAX_ROUNDS":1000,"TRICKLE_FUEL":25,"INITIAL_KARBONITE":100,"INITIAL_FUEL":500,"MINE_FUEL_COST":1,"KARBONITE_YIELD":2,"FUEL_YIELD":10,"MAX_TRADE":1024,"MAX_BOARD_SIZE":64,"MAX_ID":4096,"CASTLE":0,"CHURCH":1,"PILGRIM":2,"CRUSADER":3,"PROPHET":4,"PREACHER":5,"RED":0,"BLUE":1,"CHESS_INITIAL":100,"CHESS_EXTRA":20,"TURN_MAX_TIME":200,"MAX_MEMORY":50000000,"UNITS":[{"CONSTRUCTION_KARBONITE":null,"CONSTRUCTION_FUEL":null,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":200,"VISION_RADIUS":100,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,64],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":50,"CONSTRUCTION_FUEL":200,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":100,"VISION_RADIUS":100,"ATTACK_DAMAGE":0,"ATTACK_RADIUS":0,"ATTACK_FUEL_COST":0,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":10,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":1,"STARTING_HP":10,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":15,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":9,"FUEL_PER_MOVE":1,"STARTING_HP":40,"VISION_RADIUS":49,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":25,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":2,"STARTING_HP":20,"VISION_RADIUS":64,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[16,64],"ATTACK_FUEL_COST":25,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":30,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":3,"STARTING_HP":60,"VISION_RADIUS":16,"ATTACK_DAMAGE":20,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":15,"DAMAGE_SPREAD":3}]};

function insulate(content) {
    return JSON.parse(JSON.stringify(content));
}

class BCAbstractRobot {
    constructor() {
        this._bc_reset_state();
    }

    // Hook called by runtime, sets state and calls turn.
    _do_turn(game_state) {
        this._bc_game_state = game_state;
        this.id = game_state.id;
        this.karbonite = game_state.karbonite;
        this.fuel = game_state.fuel;
        this.last_offer = game_state.last_offer;

        this.me = this.getRobot(this.id);

        if (this.me.turn === 1) {
            this.map = game_state.map;
            this.karbonite_map = game_state.karbonite_map;
            this.fuel_map = game_state.fuel_map;
        }

        try {
            var t = this.turn();
        } catch (e) {
            t = this._bc_error_action(e);
        }

        if (!t) t = this._bc_null_action();

        t.signal = this._bc_signal;
        t.signal_radius = this._bc_signal_radius;
        t.logs = this._bc_logs;
        t.castle_talk = this._bc_castle_talk;

        this._bc_reset_state();

        return t;
    }

    _bc_reset_state() {
        // Internal robot state representation
        this._bc_logs = [];
        this._bc_signal = 0;
        this._bc_signal_radius = 0;
        this._bc_game_state = null;
        this._bc_castle_talk = 0;
        this.me = null;
        this.id = null;
        this.fuel = null;
        this.karbonite = null;
        this.last_offer = null;
    }

    // Action template
    _bc_null_action() {
        return {
            'signal': this._bc_signal,
            'signal_radius': this._bc_signal_radius,
            'logs': this._bc_logs,
            'castle_talk': this._bc_castle_talk
        };
    }

    _bc_error_action(e) {
        var a = this._bc_null_action();
        
        if (e.stack) a.error = e.stack;
        else a.error = e.toString();

        return a;
    }

    _bc_action(action, properties) {
        var a = this._bc_null_action();
        if (properties) for (var key in properties) { a[key] = properties[key]; }
        a['action'] = action;
        return a;
    }

    _bc_check_on_map(x, y) {
        return x >= 0 && x < this._bc_game_state.shadow[0].length && y >= 0 && y < this._bc_game_state.shadow.length;
    }
    
    log(message) {
        this._bc_logs.push(JSON.stringify(message));
    }

    // Set signal value.
    signal(value, radius) {
        // Check if enough fuel to signal, and that valid value.
        
        var fuelNeeded = Math.ceil(Math.sqrt(radius));
        if (this.fuel < fuelNeeded) throw "Not enough fuel to signal given radius.";
        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.COMMUNICATION_BITS)) throw "Invalid signal, must be int within bit range.";
        if (radius > 2*Math.pow(SPECS.MAX_BOARD_SIZE-1,2)) throw "Signal radius is too big.";

        this._bc_signal = value;
        this._bc_signal_radius = radius;

        this.fuel -= fuelNeeded;
    }

    // Set castle talk value.
    castleTalk(value) {
        // Check if enough fuel to signal, and that valid value.

        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.CASTLE_TALK_BITS)) throw "Invalid castle talk, must be between 0 and 2^8.";

        this._bc_castle_talk = value;
    }

    proposeTrade(karbonite, fuel) {
        if (this.me.unit !== SPECS.CASTLE) throw "Only castles can trade.";
        if (!Number.isInteger(karbonite) || !Number.isInteger(fuel)) throw "Must propose integer valued trade."
        if (Math.abs(karbonite) >= SPECS.MAX_TRADE || Math.abs(fuel) >= SPECS.MAX_TRADE) throw "Cannot trade over " + SPECS.MAX_TRADE + " in a given turn.";

        return this._bc_action('trade', {
            trade_fuel: fuel,
            trade_karbonite: karbonite
        });
    }

    buildUnit(unit, dx, dy) {
        if (this.me.unit !== SPECS.PILGRIM && this.me.unit !== SPECS.CASTLE && this.me.unit !== SPECS.CHURCH) throw "This unit type cannot build.";
        if (this.me.unit === SPECS.PILGRIM && unit !== SPECS.CHURCH) throw "Pilgrims can only build churches.";
        if (this.me.unit !== SPECS.PILGRIM && unit === SPECS.CHURCH) throw "Only pilgrims can build churches.";
        
        if (!Number.isInteger(dx) || !Number.isInteger(dx) || dx < -1 || dy < -1 || dx > 1 || dy > 1) throw "Can only build in adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't build units off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] > 0) throw "Cannot build on occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot build onto impassable terrain.";
        if (this.karbonite < SPECS.UNITS[unit].CONSTRUCTION_KARBONITE || this.fuel < SPECS.UNITS[unit].CONSTRUCTION_FUEL) throw "Cannot afford to build specified unit.";

        return this._bc_action('build', {
            dx: dx, dy: dy,
            build_unit: unit
        });
    }

    move(dx, dy) {
        if (this.me.unit === SPECS.CASTLE || this.me.unit === SPECS.CHURCH) throw "Churches and Castles cannot move.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't move off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot move outside of vision range.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] !== 0) throw "Cannot move onto occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot move onto impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);  // Squared radius
        if (r > SPECS.UNITS[this.me.unit]['SPEED']) throw "Slow down, cowboy.  Tried to move faster than unit can.";
        if (this.fuel < r*SPECS.UNITS[this.me.unit]['FUEL_PER_MOVE']) throw "Not enough fuel to move at given speed.";

        return this._bc_action('move', {
            dx: dx, dy: dy
        });
    }

    mine() {
        if (this.me.unit !== SPECS.PILGRIM) throw "Only Pilgrims can mine.";
        if (this.fuel < SPECS.MINE_FUEL_COST) throw "Not enough fuel to mine.";
        
        if (this.karbonite_map[this.me.y][this.me.x]) {
            if (this.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) throw "Cannot mine, as at karbonite capacity.";
        } else if (this.fuel_map[this.me.y][this.me.x]) {
            if (this.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) throw "Cannot mine, as at fuel capacity.";
        } else throw "Cannot mine square without fuel or karbonite.";

        return this._bc_action('mine');
    }

    give(dx, dy, karbonite, fuel) {
        if (dx > 1 || dx < -1 || dy > 1 || dy < -1 || (dx === 0 && dy === 0)) throw "Can only give to adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't give off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] <= 0) throw "Cannot give to empty square.";
        if (karbonite < 0 || fuel < 0 || this.me.karbonite < karbonite || this.me.fuel < fuel) throw "Do not have specified amount to give.";

        return this._bc_action('give', {
            dx:dx, dy:dy,
            give_karbonite:karbonite,
            give_fuel:fuel
        });
    }

    attack(dx, dy) {
        if (this.me.unit === SPECS.CHURCH) throw "Churches cannot attack.";
        if (this.fuel < SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) throw "Not enough fuel to attack.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't attack off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot attack outside of vision range.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);
        if (r > SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][1] || r < SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][0]) throw "Cannot attack outside of attack range.";

        return this._bc_action('attack', {
            dx:dx, dy:dy
        });
        
    }


    // Get robot of a given ID
    getRobot(id) {
        if (id <= 0) return null;
        for (var i=0; i<this._bc_game_state.visible.length; i++) {
            if (this._bc_game_state.visible[i].id === id) {
                return insulate(this._bc_game_state.visible[i]);
            }
        } return null;
    }

    // Check if a given robot is visible.
    isVisible(robot) {
        return ('unit' in robot);
    }

    // Check if a given robot is sending you radio.
    isRadioing(robot) {
        return robot.signal >= 0;
    }

    // Get map of visible robot IDs.
    getVisibleRobotMap() {
        return this._bc_game_state.shadow;
    }

    // Get boolean map of passable terrain.
    getPassableMap() {
        return this.map;
    }

    // Get boolean map of karbonite points.
    getKarboniteMap() {
        return this.karbonite_map;
    }

    // Get boolean map of impassable terrain.
    getFuelMap() {
        return this.fuel_map;
    }

    // Get a list of robots visible to you.
    getVisibleRobots() {
        return this._bc_game_state.visible;
    }

    turn() {
        return null;
    }
}

function Crusader() {
    this.turn = crusaderTurn;
    this.fuelpermove = SPECS.UNITS[this.me.unit].FUEL_PER_MOVE;

    this.enemyCastleLocations = this.prepareTargets();
    this.targetCtr = 0;
    this.target = this.enemyCastleLocations[this.targetCtr];
}

/**
 * March across map reflection.
 */
function crusaderTurn() {

    // attack code
    // if there are robots that I can attack,
    // and I have enough fuel to attack,
    // attack them.
    let attackbot = this.getRobotToAttack();
    if (attackbot) {
        if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
            return this.attack(attackbot.x - this.me.x, attackbot.y - this.me.y);
        }
    }
    // If there are robots that can attack me,
    // move to location that minimizes the sum of the hp damage.
    // Tiebreaker: location closest (euclidean distance) from the original path move to target
    // Fall through if no robots can attack me, or not enough fuel to move.
    let optimalmove = this.getOptimalEscapeLocation();
    if (optimalmove.length && this.fuel >= this.fuelpermove) {
        let route = this.path(this.target);
        let [dx, dy] = route.length ? route[0] : [0, 0];
        let old = [this.me.x + dx, this.me.y + dy];
        let finmove = optimalmove.reduce((a, b) => this.dist(a, old) < this.dist(b, old) ? a : b);
        //if best possible move is to stay still, return nothing.
        if (finmove[0] == this.me.x && finmove[1] == this.me.y) {
            return;
        } else {
            return this.go(finmove);
        }
    }

    // non-combat mode
    while (this.me.x == this.target[0] && this.me.y == this.target[1]) { //reset target if meet it
        if(this.targetCtr < this.enemyCastleLocations.length) {
            this.log("Prepping update: "+this.enemyCastleLocations+" "+this.targetCtr);
            this.targetCtr+=1;
            this.target = this.enemyCastleLocations[this.targetCtr];
            this.log("Update: "+this.target+" "+this.targetCtr);
        }
        else {
            let r = () => [this.rand(this.map[0].length),
                            this.rand(this.map.length)];
            this.target = r();
            while (!this.map[this.target[1]][this.target[0]]) {
                this.target = r();
            }
        }
    }

    return this.go(this.target);
}

const CLUSTER = {
    OPEN: 0,
    OTW: 1,
    CONTROLLED: 2,
    FORT: 3,
    HOSTILE: 4
};

function Castle() {
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
            let karbThresh = 50 + Math.floor(Math.sqrt(d));
            let fuelThresh = 50 + Math.floor(Math.sqrt(d));
        if (this.clusterStatus[i] == CLUSTER.OPEN && d < minScore) {
            shouldSend = (this.fuel >= fuelThresh) && (this.karbonite >= karbThresh);
            minScore = d;
            target = i;
        }
        if (this.clusterStatus[i] == CLUSTER.OPEN && this.resourceClusters[i].length >= maxSize) { // override the shortest distance if we have big cluster
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
    this.log("Castle "+this.me.id+" at ("+this.me.x+","+this.me.y+") here, on step "+this.step+".  Here's what I know about cluster status:");
    this.log(this.clusterStatus);
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
        this.castleTalk(this.myClusterIndex+1);
        this.log("castletalking my cluster: "+this.myClusterIndex);

        // listen to others clusters, mark their status
        let otherCastleClusters = talkingCastles.map(i => i.castle_talk);
        for(let i = 0; i < otherCastleClusters.length; i++) {
            this.log("I heard a friend at cluster "+otherCastleClusters[i]-1);
            this.clusterStatus[otherCastleClusters[i]-1] = CLUSTER.CONTROLLED;
            let oppositeClusterIndex = this.reflectClusterByIndex(otherCastleClusters[i]-1, this.resourceClusters);
            this.clusterStatus[oppositeClusterIndex] = CLUSTER.HOSTILE;
        }
    }
    else if (this.step == 4) {
        // listen to others clusters, mark their status
        let otherCastleClusters = talkingCastles.map(i => i.castle_talk);
        for(let i = 0; i < otherCastleClusters.length; i++) {
            this.log("I heard a friend at cluster "+otherCastleClusters[i]-1);
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
                this.clusterStatus[talk-1] = CLUSTER.CONTROLLED;
                this.log("Ah, I see that we are sending a mission to cluster "+(talk-1));
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
            this.castleTalk(targetClusterIndex+1);
            this.log("I'm sending a mission to cluster "+targetClusterIndex+" and broadcasting it.");
            //this.log("Spawning pilgrim in direction " + choice + " towards " + target);
            this.signal(this.encodeExactLocation(target), 2);
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        }
    }

    // PUMP PROPHETS CODE
    if (this.fuel >= 200 && this.karbonite >= 200 && this.defensePositions.length > 0 && targetClusterIndex == -1) {
        let target = [1,0];
        let choice = this.getSpawnLocation(target[0], target[1]);
        if (choice) {
            let defenseTarget = this.defensePositions.shift();
            this.signal(this.encodeExactLocation(defenseTarget), 2);
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

function Pilgrim() {
    this.turn = pilgrimTurn;
    this.spawnPoint = this.getVisibleRobots().filter(i => (i.unit == SPECS.CHURCH || i.unit == SPECS.CASTLE) &&
        Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2 && i.signal>=0)[0];

    this.baseLocation = [this.spawnPoint.x, this.spawnPoint.y];
    this.mineLocation = this.decodeExactLocation(this.spawnPoint.signal);
    this.adjacentDestinations = this.distSquared(this.baseLocation, this.mineLocation) <= 2;

    this.destination = this.mineLocation;
    this.karboniteMine = this.karbonite_map[this.mineLocation[1]][this.mineLocation[0]];
    this.fuelMine = this.fuel_map[this.mineLocation[1]][this.mineLocation[0]];
}

function pilgrimTurn() {
    let [x, y] = [this.me.x, this.me.y];

    //TODO: Add mission code to determine what type of cluster we're in / heading to
    //TODO: Add code to report status so church can replace if dead
    //TODO: Kiting is performing suboptimally. Fix this

    if(!this.adjacentDestinations) {
        let adjacentBases = this.getVisibleRobots().filter(i => i.unit < 2 && this.distSquared([i.x,i.y], this.mineLocation)<=2);
        if(adjacentBases.length > 0) {
            this.baseLocation = [adjacentBases[0].x, adjacentBases[0].y];
            this.adjacentDestinations = true;
        }
    }

    let escapemove = this.getOptimalHidingLocation();
    if( this.arrEq(this.destination, this.mineLocation) && x == this.mineLocation[0] && y == this.mineLocation[1]) { //at mine
        if(this.karbonite > 80 && this.fuel > 300 && this.getVisibleRobots().filter(i => i.unit < 2 
            && i.team == this.me.team && this.distSquared([i.x, i.y], [this.me.x, this.me.y])<=16).length==0) { //want to build church for mission
            let target = this.exactCentroid(this.getNearbyMines());
            let choice = this.getChurchSpawnLocation(target[0], target[1]);
            if(choice != null) {
                this.signal(this.encodeExactLocation(this.mineLocation), 2);
                this.baseLocation = [this.me.x + choice[0], this.me.y + choice[1]];
                return this.buildUnit(SPECS.CHURCH, choice[0], choice[1]);
            }
        }
        if(this.karbonite > 400 && this.fuel > 400 && this.getVisibleRobots().filter(i => i.unit < 2 
            && i.team == this.me.team && this.distSquared([i.x, i.y], [this.me.x, this.me.y])<=2).length==0) { //church because floating cash
            let nearbyPilgrims = this.getVisibleRobots().filter(i => i.unit == SPECS.PILGRIM && this.distSquared([i.x, i.y], [this.me.x, this.me.y])<=4);
            let target = [1,0];
            if(nearbyPilgrims.length > 0)
                target = [ Math.min(Math.max(nearbyPilgrims[0].x - this.me.x,1),-1), Math.min(Math.max(nearbyPilgrims[0].y - this.me.y,1),-1)];
            let choice = this.getChurchSpawnLocation(target[0], target[1]);
            if(choice != null) {
                this.signal(0, 2);
                this.baseLocation = [this.me.x + choice[0], this.me.y + choice[1]];
                return this.buildUnit(SPECS.CHURCH, choice[0], choice[1]);
            }
        }
        else if( this.fuel > 1 && ((this.fuelMine && this.me.fuel < SPECS.UNITS[this.me.unit].FUEL_CAPACITY)
            || (this.karboniteMine && this.me.karbonite < SPECS.UNITS[this.me.unit].KARBONITE_CAPACITY)) ) { //want to mine
            if(escapemove.length > 0 && !this.arrEq(escapemove[0],[this.me.x,this.me.y]) 
                && this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) { //must flee if optimal dodge is not stay still
                return this.move(...[escapemove[0][0] - this.me.x, escapemove[0][1] - this.me.y]);
            }
            return this.mine();
        }
        else { //move back to base
            this.destination = this.baseLocation;
        }
    }
    if( this.arrEq(this.destination, this.baseLocation) && this.distSquared([x,y], this.baseLocation) <=2 ) { //at base
        if(escapemove.length > 0 && !this.arrEq(escapemove[0],[this.me.x,this.me.y]) 
            && this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) { //must flee if optimal dodge is not stay still
            return this.move(...[escapemove[0][0] - this.me.x, escapemove[0][1] - this.me.y]);
        }
        let base = this.getVisibleRobots().filter(i => (i.unit == SPECS.CHURCH || i.unit == SPECS.CASTLE) &&
            Math.pow(i.x - this.me.x,2) + Math.pow(i.y - this.me.y,2) <= 2);
        if(base.length>0) { //we don't flee here! better to return resources then to flee
            this.destination = this.mineLocation;
            return this.give(base[0].x - x, base[0].y -y, this.me.karbonite, this.me.fuel);
        }
    }

    let route;
    if( this.arrEq(this.destination, this.mineLocation) ) { //moving to mine
        route = this.path(this.destination);
        
    }
    else { //( this.arrEq(this.destination, this.baseLocation) ) //moving to base
        route = this.workerpath(this.destination);
    }

    if (this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed()) && route.length > 0) { //A* towards target
        if(escapemove.length > 0) { //flee in direction of path
            let [dx, dy] = route.length ? route[0] : [0, 0];
            let old = [this.me.x + dx, this.me.y + dy];
            let finmove = escapemove.reduce((a, b) => this.dist(a, old) < this.dist(b, old) ? a : b);
            if (finmove[0] == this.me.x && finmove[1] == this.me.y) {
                return;
            } else {
                return this.move(...[finmove[0] - this.me.x, finmove[1] - this.me.y]);
            }
        }
        else { //move normally
            return this.move(...route[0]);
        }
    }
    
    return;
}

function Church() {
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
    this.homeSaturated = this.nearbyMines.length == 0;
    if (this.fuel >= 50 && this.karbonite >= 10 && !this.homeSaturated) {
        let target = this.nearbyMines.shift();
        let choice = this.getSpawnLocation(target[0], target[1]);
        if (choice) {
            this.signal(this.encodeExactLocation(target), 2);
            return this.buildUnit(SPECS.PILGRIM, choice[0], choice[1]);
        }
    }
    if (this.fuel >= 200 && this.karbonite >= 200 && this.defensePositions.length > 0) {
        let target = [1,0];
        let choice = this.getSpawnLocation(target[0], target[1]);
        if (choice) {
            let defenseTarget = this.defensePositions.shift();
            this.signal(this.encodeExactLocation(defenseTarget), 2);
            return this.buildUnit(SPECS.PROPHET, choice[0], choice[1]);
        }
    }
    return;
}

function Preacher() {
    this.turn = preacherTurn;
    this.fuelpermove = SPECS.UNITS[this.me.unit].FUEL_PER_MOVE;

    this.enemyCastleLocations = this.prepareTargets();
    this.targetCtr = 0;
    this.target = this.enemyCastleLocations[this.targetCtr];
}

/**
 * March across map reflection.
 */
function preacherTurn() {
    // attack code
    // if there are robots that I can attack,
    // and I have enough fuel to attack,
    // attack them.
    // aoeAnalysis returns a location [x, y]
    let attackbot = this.aoeAnalysis();
    if (attackbot) {
        if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
            return this.attack(attackbot[0] - this.me.x, attackbot[1] - this.me.y);
        }
    }
    // If there are robots that can attack me,
    // move to location that minimizes the sum of the hp damage.
    // Tiebreaker: location closest (euclidean distance) from the original path move to target
    // Fall through if no robots can attack me, or not enough fuel to move.
    let optimalmove = this.getOptimalEscapeLocation();
    if (optimalmove.length && this.fuel >= this.fuelpermove) {
        let route = this.path(this.target);
        let [dx, dy] = route.length ? route[0] : [0, 0];
        let old = [this.me.x + dx, this.me.y + dy];
        let finmove = optimalmove.reduce((a, b) => this.dist(a, old) < this.dist(b, old) ? a : b);
        //if best possible move is to stay still, return nothing.
        if (finmove[0] == this.me.x && finmove[1] == this.me.y) {
            return;
        } else {
            return this.go(finmove);
        }
    }


    // non-combat mode
    while (this.me.x == this.target[0] && this.me.y == this.target[1]) { //reset target if meet it
        if (this.targetCtr < this.enemyCastleLocations.length) {
            this.log("Prepping update: "+this.enemyCastleLocations+" "+this.targetCtr);
            this.targetCtr+=1;
            this.target = this.enemyCastleLocations[this.targetCtr];
            this.log("Update: "+this.target+" "+this.targetCtr);
        }
        else {
            let r = () => [this.rand(this.map[0].length),
                            this.rand(this.map.length)];
            this.target = r();
            while (!this.map[this.target[1]][this.target[0]]) {
                this.target = r();
            }
        }
    }


    // movement code
    return this.go(this.target);
}

function Prophet() {
    this.turn = prophetTurn;
    this.fuelpermove = SPECS.UNITS[this.me.unit].FUEL_PER_MOVE;

    this.enemyCastleLocations = [[0,0], [1,0], [2,0]]; //this.prepareTargets();
    this.targetCtr = 0;
    this.target = this.enemyCastleLocations[this.targetCtr];
    this.step = 0;

    //determine spawn castle for grid
    this.spawnPoint = this.getVisibleRobots().filter(i => i.unit < 2 && this.distSquared([i.x, i.y], [this.me.x, this.me.y]) <= 2 && i.signal >= 0)[0];
    this.target = this.decodeExactLocation(this.spawnPoint.signal);
}

/**
 * March across map reflection.
 */
function prophetTurn() {
    this.step++;

    // attack code
    // if there are robots that I can attack,
    // and I have enough fuel to attack,
    // attack them.
    let attackbot = this.getRobotToAttack();
    if (attackbot && !shouldRun.call(this)) {
        if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
            return this.attack(attackbot.x - this.me.x, attackbot.y - this.me.y);
        }
    }

    // If there are robots that can attack me,
    // move to location that minimizes the sum of the hp damage.
    // Tiebreaker: location closest (euclidean distance) from the original path move to target
    // Fall through if no robots can attack me, or not enough fuel to move.
    let optimalmove = this.getOptimalEscapeLocationProphet();
    if (optimalmove.length && this.fuel >= (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) {
        let route = this.path(this.target);
        let [dx, dy] = route.length ? route[0] : [0, 0];
        let old = [this.me.x + dx, this.me.y + dy];
        let finmove = optimalmove.reduce((a, b) => this.dist(a, old) < this.dist(b, old) ? a : b);
        //if best possible move is to stay still, return nothing.
        if (finmove[0] == this.me.x && finmove[1] == this.me.y) {
            return;
        } else {
            return this.move(...[finmove[0] - this.me.x, finmove[1] - this.me.y]);
        }
    }  

    //get nearest grid square
    //move to it

    // non-combat mode -- this code moves toward enemy castles. Should be activated w/ pushes

    // movement code
    //this.log(this.target+" | "+[this.spawnPoint.x, this.spawnPoint.y]+" | "+this.me.x+", "+this.me.y);
    let route = this.path(this.target); //path finding
    if (this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) {
        if (route.length > 0) { //A* towards target
            return this.move(...route[0]);
        }
    }
    
    /*
    while (this.me.x == this.target[0] && this.me.y == this.target[1]) { //reset target if meet it
        if (this.targetCtr < this.enemyCastleLocations.length) {
            this.log("Prepping update: " + this.enemyCastleLocations + " " + this.targetCtr);
            this.targetCtr += 1;
            this.target = this.enemyCastleLocations[this.targetCtr];
            this.log("Update: " + this.target + " " + this.targetCtr);
        }
        else {
            let r = () => [this.rand(this.map[0].length),
                            this.rand(this.map.length)];
            this.target = r();
            while (!this.map[this.target[1]][this.target[0]]) {
                this.target = r();
            }
        }
    } */
}

/**
 * tells if should run from nearby preachers
 */
function shouldRun() {
    return this.getVisibleRobots()
            .filter(i => i.team != this.me.team && i.unit == SPECS.PREACHER)
            .map(i => this.distSquared([this.me.x, this.me.y], [i.x, i.y]))
            .map(i => i < 18)
            .reduce((a, b) => a || b, false);
}

const top = 0;
const parent = i => ((i + 1) >>> 1) - 1;
const left = i => (i << 1) + 1;
const right = i => (i + 1) << 1;

class PriorityQueue {
  constructor(comparator = (a, b) => a > b) {
    this._heap = [];
    this._comparator = comparator;
  }
  size() {
    return this._heap.length;
  }
  isEmpty() {
    return this.size() == 0;
  }
  peek() {
    return this._heap[top];
  }
  push(...values) {
    values.forEach(value => {
      this._heap.push(value);
      this._siftUp();
    });
    return this.size();
  }
  pop() {
    const poppedValue = this.peek();
    const bottom = this.size() - 1;
    if (bottom > top) {
      this._swap(top, bottom);
    }
    this._heap.pop();
    this._siftDown();
    return poppedValue;
  }
  replace(value) {
    const replacedValue = this.peek();
    this._heap[top] = value;
    this._siftDown();
    return replacedValue;
  }
  _greater(i, j) {
    return this._comparator(this._heap[i], this._heap[j]);
  }
  _swap(i, j) {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }
  _siftUp() {
    let node = this.size() - 1;
    while (node > top && this._greater(node, parent(node))) {
      this._swap(node, parent(node));
      node = parent(node);
    }
  }
  _siftDown() {
    let node = top;
    while (
      (left(node) < this.size() && this._greater(left(node), node)) ||
      (right(node) < this.size() && this._greater(right(node), node))
    ) {
      let maxChild = (right(node) < this.size() && this._greater(right(node), left(node))) ? right(node) : left(node);
      this._swap(node, maxChild);
      node = maxChild;
    }
  }
}

const Algorithms = (function() {
    let seed = 1;

    function dist(a, b) {
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Element-wise list equality.
     */
    function arrEq(a, b) {
        return a.length == b.length && a.map((v, i) => b[i] == v).reduce((x, y) => x && y);
    }

    /**
     * Element-wise list equality. Checks if locations off by 1
     */
    function adjacentTo(a, b) {
        return Math.pow(a[0]-b[0], 2) + Math.pow(a[1]-b[1], 2) <=2;
    }

    function distSquared(a, b) {
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        return (dx * dx + dy * dy);
    }

    function getSpeed() {
        return SPECS.UNITS[this.me.unit].SPEED;
    }

    /**
     * Given a squared radius, current x position, current y position
     * returns a list of all possible locations that
     * can be reached in a single move [x,y]
     */
    function absoluteMoves(r2, curx, cury) {
        let steps = [];
        let max = Math.sqrt(r2);
        for (let x = -max; x <= max; x++) {
            for (let y = -max; y <= max; y++) {
                if (x * x + y * y <= r2) {
                    steps.push([x + curx, y + cury]);
                }
            }
        }
        return steps;
    }

    return {
        dist: dist,
        distSquared: distSquared,
        getSpeed: getSpeed,
        arrEq: arrEq,

        /**
         * get pseudorandom number
         */
        rand: function rand(len) {
            seed = ((seed + 3) * 7 + 37) % 8117 + this.me.x * 97
                    + this.me.y * 1013 + this.getVisibleRobots().length * 37;
            return seed % len;
        },

        /**
         * Gives list of valid move locations.
         */
        validAbsoluteMoves: function() {
            return absoluteMoves(this.getSpeed(), this.me.x, this.me.y).filter(m => !this.occupied(...m));
        },

        /**
         * Returns a move action to approach a target.
         */
        go: function(target) {
            let route = this.path(target); //path finding
            if (this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) {
                if (route.length > 0) { //A* towards target
                    return this.move(...route[0]);
                } else { //random move
                    return this.move(...this.randomMove());
                }
            }
        },

        /**
         * Helper function for aoeAnalysis method.
         * Given a 2d array from getVisibleRobotMap(), the length of the y and x-axis
         * and a given [j][i] index that might be in the 2d array, caculated
         * the damage done by an attack at the given index.
         * Returns 0 for a location outside of the visibleRobotMap array or for a location without robots.
         * Returns 1 for a location with enemy robots. Returns -1 for location with teammate.
         */
        getDamageMap: function(rbotmap, len, len0, j, i) {
            if(j>=len || j<0 || i>=len0 || i<0) {
                return 0;
            } else {
                let id = rbotmap[j][i];
                if(id>0) {
                    if(this.getRobot(id).team == this.me.team) {
                        return -1;
                    } else {
                        return 1;
                    }
                } else {
                    return 0;
                }
            }
        },

        /**
         * AOE Analysis for preacher attack.
         * A preacher, and preacher only, should call this function.
         * This returns the absolute location of the square which
         * the preacher should target with the AOE attack to the
         * maximum signed hpdamage, that is, max(hp damage to enemies - hp damage to team).
         * Returns null if all possible attack locations result in 0 or negative damage.
         */
         aoeAnalysis: function() {
             let rbotmap = this.getVisibleRobotMap();
             let aoelocation = null;
             let maxhpdamage = 0;
             let rbotmaplen = rbotmap.length;
             let rbotmaplen0 = rbotmap[0].length;
             let rad2 = 16;
             let rad = 4;

             let miny = Math.max(0, this.me.y-rad);
             let maxy = Math.min(rbotmaplen-1, this.me.y+rad);
             let minx = Math.max(0, this.me.x-rad);
             let maxx = Math.min(rbotmaplen0-1, this.me.x+rad);

             for (let j=miny; j<=maxy; j++) {
                 for (let i=minx; i<=maxx; i++) {
                     let rely = this.me.y-j;
                     let relx = this.me.x-i;
                     if ((rely*rely + relx*relx) <= rad2) {
                         if((i == this.me.x && j == this.me.y) || rbotmap[j][i]==-1) {
                             continue;
                         }
                         let hpdamage = 0;
                         for (let k=j-1; k<=j+1; k++) {
                             for (let l=i-1; l<=i+1; l++) {
                                 hpdamage += this.getDamageMap(rbotmap, rbotmaplen, rbotmaplen0, k, l);
                             }
                         }
                         if (hpdamage > maxhpdamage) {
                             maxhpdamage = hpdamage;
                             aoelocation = [i,j];
                         }
                    }
                 }
             }
             return aoelocation;
        },

        /**
         * Returns a robot to attack if possible.
         */
        getRobotToAttack: function() {
            const rad = SPECS.UNITS[this.me.unit].ATTACK_RADIUS;
            const priority = { // unit target priority tiebreakers
                0: 1,
                1: 0,
                2: 2,
                3: 3,
                4: 3,
                5: 4,
            };
            let robots = this.getVisibleRobots()
                             .filter(i =>
                                    (d => i.team != this.me.team
                                            && d >= rad[0]
                                            && d <= rad[1])(this.distSquared([i.x, i.y], [this.me.x, this.me.y])));
            if (robots.length)
                return robots.reduce((a, b) => {
                    const threat = this.threat(b) - this.threat(a);
                    const type = priority[b.unit] - priority[a.unit];
                    const id = a.id - b.id;
                    return (threat ? threat : (type ? type : id)) > 0 ? b : a;
                });
        },

        /*
         * Returns the optimal absolute location you should move to
         * by minimizing hp damage from enemy robots around you.
         * Return value: null if NO enemies are present or the
         * max hp damage by enemy robots is 0.
         */
        getOptimalEscapeLocation: function() {
            let visibleRobots = this.getVisibleRobots().filter(i => i.unit > 2 && i.team != this.me.team);
            if (visibleRobots.length == 0) {
                return [];
            }
            let minhpdamage = Infinity;
            let maxhpdamage = 0;
            let optimalmove = [];
            let possiblemoves = this.validAbsoluteMoves();
            //add "staying still" to possible moves list
            possiblemoves.push([this.me.x,this.me.y]);
            //this.log(possiblemoves.length)
            for (let move of possiblemoves) {
                let hpdamage = 0;
                for (let i of visibleRobots) {
                    let dSquaredtoEnemy = distSquared([i.x, i.y], [move[0], move[1]]);
                    hpdamage += this.expectedDamage(i, dSquaredtoEnemy);
                }
                //this.log(`movr=${move} hpp=${hpdamage}`);
                if (hpdamage < minhpdamage) {
                    optimalmove = [move];
                    minhpdamage = hpdamage;
                } else if (hpdamage == minhpdamage) {
                    optimalmove.push(move);
                }
                if (hpdamage > maxhpdamage) {
                    maxhpdamage = hpdamage;
                }
            }
            if (maxhpdamage == 0) {
                return [];
            }
            return optimalmove;
        },

        /*
         * Returns move that ensures no enemies can see you
         * Used for pilgrims to kite
         */
        getOptimalHidingLocation: function() {
            let visibleRobots = this.getVisibleRobots().filter(i => i.unit > 2 && i.team != this.me.team);
            let visibleAllies = this.getVisibleRobots().filter(i => i.unit > 2 && i.team == this.me.team);
            if (visibleRobots.length == 0 || visibleAllies.length > 8) {
                return [];
            }
            let optimalmove = [];
            let possiblemoves = this.validAbsoluteMoves();
            //add "staying still" to possible moves list
            possiblemoves.unshift([this.me.x,this.me.y]);

            for (let move of possiblemoves) {
                let validmove = true;
                for (let i of visibleRobots) {
                    let dSquaredtoEnemy = distSquared([i.x, i.y], [move[0], move[1]]);
                    if(dSquaredtoEnemy <=  SPECS.UNITS[i.unit].VISION_RADIUS + 1) {
                        validmove = false;
                        break;
                    }
                }
                if(validmove)
                    optimalmove.push(move);
            }
            return optimalmove;
        },

        /**
         * Given a robot, tells you if it can kill you.
         * Returns the amount of HP damage.
         */
        expectedDamageProphet: function(i, dSquared) {
            let attack_rad2 = SPECS.UNITS[i.unit].ATTACK_RADIUS;
            if (!attack_rad2) {
                return 0;
            } else {
                if (attack_rad2[0] <= dSquared && (dSquared <= attack_rad2[1] || i.unit==5 && dSquared <= attack_rad2[1]+2) ) {
                    return SPECS.UNITS[i.unit].ATTACK_DAMAGE;
                } else {
                    return 0;
                }
            }
        },

        /*
         * Returns the optimal absolute location you should move to
         * by minimizing hp damage from enemy robots around you.
         * Return value: null if NO enemies are present or the
         * max hp damage by enemy robots is 0.
         */
        getOptimalEscapeLocationProphet: function() {
            let visibleRobots = this.getVisibleRobots().filter(i => i.unit > 2 && i.team != this.me.team);
            if (visibleRobots.length == 0) {
                return [];
            }
            let minhpdamage = Infinity;
            let maxhpdamage = 0;
            let optimalmove = [];
            let possiblemoves = this.validAbsoluteMoves();
            //add "staying still" to possible moves list
            possiblemoves.push([this.me.x,this.me.y]);
            //this.log(possiblemoves.length)
            for (let move of possiblemoves) {
                let hpdamage = 0;
                for (let i of visibleRobots) {
                    let dSquaredtoEnemy = distSquared([i.x, i.y], [move[0], move[1]]);
                    hpdamage += this.expectedDamageProphet(i, dSquaredtoEnemy);
                }
                //this.log(`movr=${move} hpp=${hpdamage}`);
                if (hpdamage < minhpdamage) {
                    optimalmove = [move];
                    minhpdamage = hpdamage;
                } else if (hpdamage == minhpdamage) {
                    optimalmove.push(move);
                }
                if (hpdamage > maxhpdamage) {
                    maxhpdamage = hpdamage;
                }
            }
            if (maxhpdamage == 0) {
                return [];
            }
            return optimalmove;
        },

        prepareTargets: function() {
            let enemyCastleLocations = [];
            let castles = this.getVisibleRobots().filter(i => i.team == this.me.team && i.unit == 0);
            for (let i = 0; i < castles.length; i++) {
                let castle = castles[i];
                let signal = castle.signal;
                if (signal != undefined && signal!=-1) {
                    enemyCastleLocations.push(this.reflectPoint(castle.x, castle.y));
                    enemyCastleLocations.push(this.decodeLocation(signal % (2 ** 8)));
                    enemyCastleLocations.push(this.decodeLocation(Math.floor(signal / (2 ** 8))));
                    let myloc = [this.me.x, this.me.y];
                    if (this.distSquared(myloc, enemyCastleLocations[1]) < distSquared(myloc, enemyCastleLocations[0])) {
                        let a = enemyCastleLocations[0];
                        enemyCastleLocations[0] = enemyCastleLocations[1];
                        enemyCastleLocations[1] = a;
                    }
                    if (this.distSquared(myloc, enemyCastleLocations[2]) < distSquared(myloc, enemyCastleLocations[0])) {
                        let a = enemyCastleLocations[0];
                        enemyCastleLocations[0] = enemyCastleLocations[2];
                        enemyCastleLocations[2] = a;
                    }
                    if (this.distSquared(enemyCastleLocations[0], enemyCastleLocations[2]) < distSquared(enemyCastleLocations[0], enemyCastleLocations[1])) {
                        let a = enemyCastleLocations[2];
                        enemyCastleLocations[2] = enemyCastleLocations[1];
                        enemyCastleLocations[1] = a;
                    }
                    return enemyCastleLocations;
                }
            }
            let r = () => [this.rand(this.map[0].length),
                            this.rand(this.map.length)];
            let target = r();
            while (!this.map[target[1]][target[0]]) {
                target = r();
            }
            enemyCastleLocations.push(target);
            return enemyCastleLocations;
        },

        /**
         * Check nearby tiles to get mines
         * Karbonite mines are prioritized over fuel mines
         */
        getNearbyMines: function() {
            let x = this.me.x;
            let y = this.me.y;
            let mines = [];
            let zonesize = 3;
            for(let dx = -zonesize; dx < zonesize+1; dx++) {
                for(let dy = -zonesize; dy<zonesize+1; dy++) {
                    if(x+dx>=0 && y+dy>=0 && x+dx<this.map.length && y+dy<this.map.length &&
                         dx*dx + dy*dy <= 13) { //within r^2
                        if(this.karbonite_map[y+dy][x+dx]) {
                            mines.unshift([x+dx, y+dy]);
                        }
                        if(this.fuel_map[y+dy][x+dx]) {
                            mines.push([x+dx, y+dy]);
                        }
                    }
                }
            }
            return mines;
        },

        /*
         * Gets nearest defense matrix location
         */
        getDefensePositions: function(source) {
            let positions = [];
            let dirs = [-1, 1];
            for(let max = 2; max<50; max+=2) {
                let delta = [max, 0];
                for(let i=0; i<max/2*4+4; i++) {
                    //check if valid
                    if (!this.occupied(source[0] + delta[0], source[1] + delta[1])
                        && !this.karbonite_map[source[1] + delta[1]][source[0] + delta[0]]
                        && !this.fuel_map[source[1] + delta[1]][source[0] + delta[0]]) {
                        positions.push([source[0] + delta[0], source[1] + delta[1]]);
                    }

                    delta[0] = delta[0] + dirs[0];
                    delta[1] = delta[1] + dirs[1];
                    if(delta[0] == max || delta[0] == -max)
                        dirs[0] = dirs[0] * -1;
                    if(delta[1] == max || delta[1] == -max)
                        dirs[1] = dirs[1] * -1;
                }
            }
            return positions;
        },

        /**
         * Returns the zone # from x,y
         * current implementation: 8-bit integer, so we can
         * encode 2 zones in 1 comm (the two castles that
         * the attacker is not spawned in) plus extra info
         * first 4 bits: x coord
         * second 4 bits: y coord
         */
        encodeLocation: function(x, y, xbits, ybits) {
            if (typeof(xbits)==='undefined') xbits = 8;
            if (typeof(ybits)==='undefined') ybits = 8;
            let sz = this.fuel_map.length;
            return ybits * Math.floor(x * xbits / sz) + Math.floor(y * ybits / sz);
        },

        /**
         * Returns x,y from the zone #
         */
        decodeLocation: function(zone, xbits, ybits) {
            if (typeof(xbits)==='undefined') xbits = 8;
            if (typeof(ybits)==='undefined') ybits = 8;
            let sz = this.fuel_map.length;
            let x = Math.floor(0.5 + (Math.floor(zone / ybits) + 0.5) * sz / xbits);
            let y = Math.floor(0.5 + ((zone%ybits) + 0.5) * sz / ybits);
            return this.nearestEmptyLocation(x, y);
        },

        /**
         * Encodes exact location into 12 bits
         * location[0] = x, location[y] = 1
         */
         encodeExactLocation: function(location) {
            return location[0]*64 + location[1];
         },

         /**
         * Decodes exact location into 12 bits
         */
         decodeExactLocation: function(zone) {
            return [ Math.floor(zone / 64) % 64, zone % 64];
         },

        /**
         * Returns x,y nearby that is empty
         */
        nearestEmptyLocation: function(x, y) {
            let sz = this.fuel_map.length;
            let map = this.map;
            if (map[y][x])
                return [x, y];
            for (let dx = -1; dx<2; dx++) {
                for (let dy = -1; dy<2; dy++) {
                    if (y + dy >= 0 && x + dx >= 0 && y + dy < sz && x + dx < sz && map[y + dy][x + dx])
                        return [x + dx, y + dy];
                }
            }
        },

        /**
         * Returns the reflected position of castles across the map.
         */
        reflectPoint: function(x, y) {
            let vertical = this.fuel_map.every(
                                r => r.slice(0, r.length / 2)
                                .map((v, i) => r[r.length - i - 1] == v)
                                .reduce((a, b) => a && b));
            if (vertical) {
                return [this.fuel_map[0].length - x - 1, y];
            } else {
                return [x, this.fuel_map.length - y - 1];
            }
        },

        /**
         * Returns the reflected position of castles across the map.
         */
        reflection: function() {
            let vertical = this.fuel_map.every(
                                r => r.slice(0, r.length / 2)
                                .map((v, i) => r[r.length - i - 1] == v)
                                .reduce((a, b) => a && b));
            if (vertical) {
                return [this.fuel_map[0].length - this.me.x - 1, this.me.y];
            } else {
                return [this.me.x, this.fuel_map.length - this.me.y - 1];
            }
        },

        occupied: function(x, y) {
            try {
                return !this.map[y][x] || this.getVisibleRobotMap()[y][x] != 0;
            } catch (e) {
                return true;
            }
        },

        /**
         * Run expectedDamage with current location.
         */
        threat: function(r) {
            return this.expectedDamage(r, this.distSquared([this.me.x, this.me.y], [r.x, r.y]));
        },

        /**
         * Given a robot, tells you if it can kill you.
         * Returns the amount of HP damage.
         */
        expectedDamage: function(i, dSquared) {
            let attack_rad2 = SPECS.UNITS[i.unit].ATTACK_RADIUS;
            if (!attack_rad2) {
                return 0;
            } else {
                if (attack_rad2[0] <= dSquared && dSquared <= attack_rad2[1]) {
                    return SPECS.UNITS[i.unit].ATTACK_DAMAGE;
                } else {
                    return 0;
                }
            }
        },

        /**
         * Get list of resources ordered by nearness.
         */
        findResources: function() {
            let map1 = this.fuel_map;
            let map2 = this.karbonite_map;
            let x = this.me.x;
            let y = this.me.y;
            let pos = [];
            for (let i = 0; i < map1.length; i++) {
                for (let j = 0; j < map1.length; j++) {
                    if (map1[j][i] || map2[j][i])
                        pos.push([distSquared([x, y], [i, j]), [i, j]]);
                }
            }
            return pos.sort((a, b) => a[0] - b[0]).map(x => x[1]);
        },

        findNearestClusterIndex: function(point, clusters) {
            let minScore = 7939; // R^2; this is 2*63^2 + 1
            let target = -1;
            for (let i = 0; i < clusters.length; i++) {
                let d = this.distSquared(this.centroid(clusters[i]), point);
                if (d < minScore) {
                    minScore = d;
                    target = i;
                }
            }
            return target;
        },

        /**
         * returns a list of clusters
         * each cluster is a list of tuples [x,y,t] where [x,y] is the resource loc,
         * t = true if karbonite, false if fuel
         */
        clusterResourceTiles: function() {
            let placesToLook = [];
            for(let i = -2; i <= 2; i++) {
                for(let j = -2; j <= 2; j++) {
                    placesToLook.push([i,j]);
                }
            }
            let fmap = this.fuel_map;
            let kmap = this.karbonite_map;
            let sz = fmap.length;
            let clustered = new Array(sz).fill(0).map(x => new Array(sz).fill(false));
            let clusters = new Array();

            for(let i = 0; i < sz; i++) {
                for(let j = 0; j < sz; j++) {
                    if(!clustered[j][i] && (fmap[j][i] || kmap[j][i])) {
                        clustered[j][i] = true;
                        let searchQueue = [];
                        searchQueue.push([i, j]);
                        let cluster = [[i,j]];
                        while(searchQueue.length > 0) {
                            let currentLoc = searchQueue.shift(); // O(n) but should be ok
                            for(let k = 0; k < placesToLook.length; k++) {
                                let delta = placesToLook[k];
                                let newi = currentLoc[0] + delta[0];
                                let newj = currentLoc[1] + delta[1];
                                if(0 <= newi && newi < sz && 0 <= newj && newj < sz
                                    && (fmap[newj][newi] || kmap[newj][newi]) && !clustered[newj][newi]) {
                                    searchQueue.push([newi, newj]);
                                    cluster.push([newi, newj]);
                                    clustered[newj][newi] = true;
                                }
                            }
                        }
                        clusters.push(cluster);
                    }
                }
            }
            return clusters;
        },

        /**
         * given a list of points, compute their centroid rounded to the nearest integer.
         */
        centroid: function(cluster) {
            let xsum = 0;
            let ysum = 0;
            for (let i = 0; i < cluster.length; i++) {
                xsum += cluster[i][0];
                ysum += cluster[i][1];
            }
            return [Math.floor((xsum / cluster.length) + 0.5), Math.floor((ysum / cluster.length) + 0.5)];
        },

        exactCentroid: function(cluster) {
            let xsum = 0;
            let ysum = 0;
            for (let i = 0; i < cluster.length; i++) {
                xsum += cluster[i][0];
                ysum += cluster[i][1];
            }
            return [(xsum / cluster.length), (ysum / cluster.length)];
        },


        /**
         *
         */
        reflectClusterByIndex: function(i, clusters) {
            let cluster = clusters[i];
            let reflected = this.reflectPoint(cluster[0][0], cluster[0][1]);
            for(let j = 0; j < clusters.length; j++) {
                for(let k = 0; k < clusters[j].length; k++) {
                    if(clusters[j][k][0] == reflected[0] && clusters[j][k][1] == reflected[1])
                        return j;
                }
            }
            return i; // shouldn't actually need to be called but why not
        },

        /**
         * Return optimal spawn location (as a one-tile move) towards a destination (x, y)
         * Returns null if all 8 locations are occupied
         */
        getSpawnLocation: function(x, y) {
            const choices = [[1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1], [0,-1], [1,-1]];
            let optimalIndex = Math.floor((4 * (Math.atan2(y - this.me.y,x - this.me.x) / Math.PI)) + 8.5) % 8;
            let choice = choices[optimalIndex];
            if (!this.occupied(this.me.x + choice[0], this.me.y + choice[1]))
                return choice;
            for (let i = 1; i <= 4; i++) {
                choice = choices[(optimalIndex + 1) % 8];
                if (!this.occupied(this.me.x + choice[0], this.me.y + choice[1]))
                    return choice;
                choice = choices[(optimalIndex + (8 - i)) % 8];
                if (!this.occupied(this.me.x + choice[0], this.me.y + choice[1]))
                    return choice;
            }
            return null;
        },

        /**
         * Return optimal spawn location (as a one-tile move) towards a destination (x, y)
         * Returns null if all 8 locations are occupied
         */
        getChurchSpawnLocation: function(x, y) {
            const choices = [[1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1], [0,-1], [1,-1]];
            let optimalIndex = Math.floor((4*(Math.atan2(y-this.me.y,x-this.me.x)/Math.PI))+8.5) % 8;
            let choice = choices[optimalIndex];
            if (!this.occupied(this.me.x + choice[0], this.me.y + choice[1])
                && !this.karbonite_map[this.me.y + choice[1]][this.me.x + choice[0]]
                && !this.fuel_map[this.me.y + choice[1]][this.me.x + choice[0]])
                return choice;
            for (let i = 1; i <= 4; i++) {
                choice = choices[(optimalIndex + 1) % 8];
                if (!this.occupied(this.me.x + choice[0], this.me.y + choice[1])
                    && !this.karbonite_map[this.me.y + choice[1]][this.me.x + choice[0]]
                    && !this.fuel_map[this.me.y + choice[1]][this.me.x + choice[0]])
                    return choice;
                choice = choices[(optimalIndex+(8 - i)) % 8];
                if (!this.occupied(this.me.x + choice[0], this.me.y + choice[1])
                    && !this.karbonite_map[this.me.y + choice[1]][this.me.x + choice[0]]
                    && !this.fuel_map[this.me.y + choice[1]][this.me.x + choice[0]])
                    return choice;
            }
            return null;
        },

        /**
         * Return random, valid, one-tile move.
         */
        randomMove: function() {
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            let choice = choices[this.rand(choices.length)];
            for (;;) {
                let locx = this.me.x + choice[0];
                let locy = this.me.y + choice[1];
                if (!this.occupied(locx, locy))
                    break;
                choice = choices[this.rand(choices.length)];
            }
            return choice;
        },

        /**
         * Return a random, valid, move within a given radius^2.
         */
        randomMoveRadiusSquared: function(r2) {
            if (r2 < 1) {
                return [0, 0];
            }
            let choices = [];
            let max = Math.sqrt(r2);
            for (let x = -max; x <= max; x++) {
                for (let y = -max; y <= max; y++) {
                    if (x * x + y * y <= r2) {
                        choices.push([x, y]);
                    }
                }
            }
            let choice = choices[this.rand(choices.length)];
            for (;;) {
                let locx = this.me.x + choice[0];
                let locy = this.me.y + choice[1];
                if (!this.occupied(locx, locy))
                    break;
                choice = choices[this.rand(choices.length)];
            }
            return choice;
        },

        /**
         * Takes in destination [x, y].
         * Return a list of [dx, dy] instructions to get from current location to destination.
         */
        path: function(dest) {
            let start = [this.me.x, this.me.y];
            let map = this.map;
            let occupied = this.getVisibleRobotMap();
            if (dest[1] >= map.length
                || dest[0] >= map[0].length
                || dest[1] < 0
                || dest[0] < 0
                || !map[dest[1]][dest[0]]
                || occupied[dest[1]][dest[0]] > 0) {
                return [];
            }
            let openHash = {};
            let done = new PriorityQueue((a, b) => h(a) < h(b));
            let prev = {}; //used to reconstruct map
            let h = x => (Math.abs(dest[0] - x[0]) + Math.abs(dest[1] - x[1])) / getSpeed.call(this); //~steps away from destination
            let hash = p => p[0] * 67 * 73 + p[1];
            let g = {}; //distance from origin in terms of steps taken
            g[start] = 0;
            let f = {}; //g + heuristic (dist to destination)
            f[start] = h(start);

            const queue = new PriorityQueue((a, b) => f[a] < f[b]);
            queue.push(start);
            let i = 128;
            while (!queue.isEmpty()) {
                let current = queue.pop(); //pop from priority queue instead of magic symbols
                done.push(current);
                if (i-- < 0 || arrEq(current, dest)) { //found destination
                    if (i < 0)
                        current = done.pop();
                    let totalPath = [current];
                    while (current in prev) { //reconstruct path
                        current = prev[current];
                        totalPath.push(current);
                    }
                    let path = [];
                    for (let i = 1; i < totalPath.length; i++) { //reformat path
                        let [a, b] = totalPath[i];
                        let [c, d] = totalPath[i - 1];
                        path.push([c - a, d - b]);
                    }
                    path.reverse();
                    return path;
                }
                for (let neighbor of absoluteMoves(getSpeed.call(this), current[0], current[1])) { //loops over all moves
                    if (neighbor[1] >= map.length
                            || neighbor[0] >= map[0].length
                            || neighbor[1] < 0
                            || neighbor[0] < 0
                            || !map[neighbor[1]][neighbor[0]]
                            || occupied[neighbor[1]][neighbor[0]] > 0
                            || openHash[hash(neighbor)]
                            || g[neighbor] != undefined) //filters invalid moves or already taken moves
                        continue;
                    queue.push(neighbor); //push
                    openHash[hash(neighbor)] = true;
                    prev[neighbor] = current; //sets current path for backtrace
                    g[neighbor] = g[current] + 1;
                    f[neighbor] = g[neighbor] + h(neighbor);
                }
            }
            return [];
        },

        /**
         * Takes in destination [x, y].
         * Return a list of [dx, dy] instructions to get from current location to destination.
         */
        workerpath: function(dest) {
            let start = [this.me.x, this.me.y];
            let map = this.map;
            let occupied = this.getVisibleRobotMap();
            if (dest[1] >= map.length
                || dest[0] >= map[0].length
                || dest[1] < 0
                || dest[0] < 0) {
                return [];
            }
            let openHash = {};
            let done = new PriorityQueue((a, b) => h(a) < h(b));
            let prev = {}; //used to reconstruct map
            let h = x => (Math.abs(dest[0] - x[0]) + Math.abs(dest[1] - x[1])) / getSpeed.call(this); //~steps away from destination
            let hash = p => p[0] * 67 * 73 + p[1];
            let g = {}; //distance from origin in terms of steps taken
            g[start] = 0;
            let f = {}; //g + heuristic (dist to destination)
            f[start] = h(start);

            const queue = new PriorityQueue((a, b) => f[a] < f[b]);
            queue.push(start);
            let i = 128;
            while (!queue.isEmpty()) {
                let current = queue.pop(); //pop from priority queue instead of magic symbols
                done.push(current);
                if (i-- < 0 || adjacentTo(current, dest)) { //found destination
                    if (i < 0)
                        current = done.pop();
                    let totalPath = [current];
                    while (current in prev) { //reconstruct path
                        current = prev[current];
                        totalPath.push(current);
                    }
                    let path = [];
                    for (let i = 1; i < totalPath.length; i++) { //reformat path
                        let [a, b] = totalPath[i];
                        let [c, d] = totalPath[i - 1];
                        path.push([c - a, d - b]);
                    }
                    path.reverse();
                    return path;
                }
                for (let neighbor of absoluteMoves(getSpeed.call(this), current[0], current[1])) { //loops over all moves
                    if (neighbor[1] >= map.length
                            || neighbor[0] >= map[0].length
                            || neighbor[1] < 0
                            || neighbor[0] < 0
                            || !map[neighbor[1]][neighbor[0]]
                            || occupied[neighbor[1]][neighbor[0]] > 0
                            || openHash[hash(neighbor)]
                            || g[neighbor] != undefined) //filters invalid moves or already taken moves
                        continue;
                    queue.push(neighbor); //push
                    openHash[hash(neighbor)] = true;
                    prev[neighbor] = current; //sets current path for backtrace
                    g[neighbor] = g[current] + 1;
                    f[neighbor] = g[neighbor] + h(neighbor);
                }
            }
            return [];
        },
    }
})();

class MyRobot extends BCAbstractRobot {
    turn() {
        for (let i in Algorithms) {
            this[i] = Algorithms[i];
        }
        if (this.me.unit === SPECS.CRUSADER) {
            Crusader.call(this);
        } else if (this.me.unit === SPECS.CASTLE) {
            Castle.call(this);
        } else if (this.me.unit === SPECS.PILGRIM) {
            Pilgrim.call(this);
        } else if (this.me.unit === SPECS.CHURCH) {
            Church.call(this);
        } else if (this.me.unit === SPECS.PREACHER) {
            Preacher.call(this);
        } else if (this.me.unit === SPECS.PROPHET) {
            Prophet.call(this);
        }
        return this.turn();
    }
}

var robot = new MyRobot();
