import {SPECS} from 'battlecode';

export function Prophet() {
    this.turn = prophetTurn;
    this.target = this.reflection();
    this.fuelpermove = SPECS.UNITS[this.me.unit].FUEL_PER_MOVE
}

/**
 * March across map reflection.
 */
function prophetTurn() {

    // attack code
    if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
        for (let i of this.getVisibleRobots()) {
            let dSquaredtoEnemy = this.distSquared([i.x, i.y], [this.me.x, this.me.y])
            if (i.team != this.me.team && dSquaredtoEnemy <= 64
                    && dSquaredtoEnemy >= 16) {
                return this.attack(i.x - this.me.x, i.y - this.me.y);
            }
        }
    } else {
        //move away from or orthogonal to an enemy
        for (let i of this.getVisibleRobots()) {
            let dSquaredtoEnemy = this.distSquared([i.x, i.y], [this.me.x, this.me.y])
            if(i.team != this.me.team) {
                let hpdamage = this.canItKillMe(i, dSquaredtoEnemy);
            }
        }
        return;
    }

    // get new target if target is empty
    if (this.me.x == this.target[0] && this.me.y == this.target[1]) {
         let r = () => [Math.floor(Math.random() * this.map[0].length),
                         Math.floor(Math.random() * this.map.length)];
         this.target = r();
         while (!this.map[this.target[1]][this.target[0]]) {
             this.target = r();
         }
    }

    // movement code
    let route = this.path(this.target);
    if (this.fuel > (this.fuelpermove * this.getSpeed())) {
        if (route.length > 0) { //A* towards target
            return this.move(...route[0]);
        } else { //random move
            if (this.fuel / this.fuelpermove < 1) {
                return;
            }
            return this.move(...this.randomMove());
        }
    }
}
