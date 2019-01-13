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
        let attackbot = this.getRobotToAttack();
        if (attackbot) {
            return this.attack(attackbot.x - this.me.x, attackbot.y - this.me.y);
        }
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
    return this.go(this.target);
}
