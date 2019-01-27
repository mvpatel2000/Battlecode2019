import {SPECS} from 'battlecode';

export function Preacher() {
    this.turn = preacherTurn;
    this.fuelpermove = SPECS.UNITS[this.me.unit].FUEL_PER_MOVE;

    this.enemyCastleLocations = [[0,0], [1,0], [2,0]]; //this.prepareTargets();
    this.targetCtr = 0;
    this.target = this.enemyCastleLocations[this.targetCtr];
    this.step = 0;

    //determine spawn castle for grid
    this.spawnPoint = this.getVisibleRobots().filter(i => i.unit < 2 && this.distSquared([i.x, i.y], [this.me.x, this.me.y]) <= 2 && i.signal >= 0)[0];
    this.target = this.decodeExactLocation(this.spawnPoint.signal);

    this.moves = 0;
}

/**
 * March across map reflection.
 */
function preacherTurn() {
    this.pushAnalysis();

    // attack code
    // if there are robots that I can attack,
    // and I have enough fuel to attack,
    // attack them.
    // aoeAnalysis returns a location [x, y]
    if (this.getRobotToAttack()) {
        let attackbot = this.aoeAnalysis();
        if (attackbot) {
            if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
                return this.attack(attackbot[0] - this.me.x, attackbot[1] - this.me.y);
            }
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

    //if(this.defend == true)
    //    return;

    let route = this.path(this.target); //path finding
    if (this.moves < 20 && this.fuel > (SPECS.UNITS[this.me.unit].FUEL_PER_MOVE * this.getSpeed())) {
        if (route.length > 0) { //A* towards target
            //this.moves++;
            return this.move(...route[0]);
        }
    }
    return;
}
