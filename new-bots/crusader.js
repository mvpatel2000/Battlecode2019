import {SPECS} from 'battlecode';

export function Crusader() {
    this.turn = crusaderTurn;
    this.target = this.reflection();
    this.fuelpermove = SPECS.UNITS[this.me.unit].FUEL_PER_MOVE
}

/**
 * March across map reflection.
 */
function crusaderTurn() {

    // combat mode
    let nearbyUnits = this.getVisibleRobots();
    //find weakest enemy unit in attack range to target
    //find nearest enemy unit.
        //if we didnt attack this turn, move towards it UNLESS it moves you into its attacking range. (just call A*)
        //Exception: if there is a long-range boi, rush it.
    for (let i of nearbyUnits) {
        if (this.fuel > SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) {
            if (i.team != this.me.team && this.dist([i.x, i.y], [this.me.x, this.me.y]) <= 4) {
                return this.attack(i.x - this.me.x, i.y - this.me.y);
            }
        } else {
            //move away from enemies that can attack me (or orthogonally)
            return;
        }
    }

    // non-combat mode
    if (this.me.x == this.target[0] && this.me.y == this.target[1]) { //reset target if meet it
         let r = () => [Math.floor(Math.random() * this.map[0].length),
                         Math.floor(Math.random() * this.map.length)];
         this.target = r();
         while (!this.map[this.target[1]][this.target[0]]) {
             this.target = r();
         }
    }

    let route = this.path(this.target); //path finding
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
