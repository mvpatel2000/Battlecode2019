import {SPECS} from 'battlecode';

export function Prophet() {
    this.turn = prophetTurn;
    this.fuelpermove = SPECS.UNITS[this.me.unit].FUEL_PER_MOVE;

    this.enemyCastleLocations = [[0,0], [1,0], [2,0]]; //this.prepareTargets();
    this.targetCtr = 0;
    this.target = this.enemyCastleLocations[this.targetCtr];
    this.step = 0;
<<<<<<< HEAD
    this.harrass = 0;
=======

    let sig = this.spawnPoint.signal;
    this.log((sig << 0).toString(2));
    if (sig >> 15) {
        this.log('raider');
        this.harasser = true;
        this.avoid = [((1 << 5) - 1) & (sig >> 10),
                        ((1 << 5) - 1) & (sig >> 5),
                        ((1 << 5) - 1) & sig]
    }

    //harassers
    if (this.harasser) {
        this.resourceClusters = this.clusterResourceTiles();
        this.resourceCentroids = this.resourceClusters.map(x => this.centroid(x));
        this.avoid.forEach(i => {
            this.resourceCentroids.splice(i, 1, null);
        });
        this.resourceCentroids = this.resourceCentroids.filter(i => i);
        this.queue = this.resourceCentroids;
        this.turn = harassTurn;
    }

>>>>>>> 662fa850c5be1123b74f517cda90c2cc95f86a7e
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


function harassTurn() {
    this.log('harassing');
    let attackbot = this.getRobotToAttack();
    if (attackbot && !shouldRun.call(this)) {
        if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
            return this.attack(attackbot.x - this.me.x, attackbot.y - this.me.y);
        }
    }
    if (this.dist(this.queue[0], [this.me.x, this.me.y]) < 3) {
        this.queue.push(this.queue.shift());
    }
    return this.go(this.queue[0]);
}
