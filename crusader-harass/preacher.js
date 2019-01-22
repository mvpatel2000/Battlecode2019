import {SPECS} from 'battlecode';

export function Preacher() {
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
