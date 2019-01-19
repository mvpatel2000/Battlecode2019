import {SPECS} from 'battlecode';

export function Prophet() {
    this.turn = prophetTurn;
    this.fuelpermove = SPECS.UNITS[this.me.unit].FUEL_PER_MOVE;

    this.enemyCastleLocations = this.prepareTargets();
    this.targetCtr = 0;
    this.target = this.enemyCastleLocations[this.targetCtr];
    this.defender = this.rand(100) < 20;
    if (this.defender) {
        this.log('Building defender')
        this.target = [this.me.x + this.rand(7) - 4, this.me.y + this.rand(7) - 4]
    } else if (this.rand(100) < 20) {
        this.log('Building raider')
        let res = this.findResources();
        this.raider = true;
        this.target = res[this.rand(res.length)];
    }
    this.step = 0;
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
    if (optimalmove.length && this.fuel >= this.fuelpermove) {
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

    // one move per 50 steps
    if (this.step > 50 || this.fuel_map[this.me.y][this.me.x]
                       || this.karbonite_map[this.me.y][this.me.x] || this.raider)
        this.step = 0;
    else if (this.step > 3 && this.me.turn < 600)
        return;

    // non-combat mode
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
    }
    // movement code
    return this.go(this.target);
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
