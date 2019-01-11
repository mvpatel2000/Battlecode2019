import {SPECS} from 'battlecode';

export function Preacher() {
    this.turn = preacherTurn;
    this.target = this.reflection();
}

/**
 * March across map reflection.
 */
function preacherTurn() {
    // attack code
    for (let i of this.getVisibleRobots()) {
        if (this.fuel > 25) {
            if (i.team != this.me.team && this.dist([i.x, i.y], [this.me.x, this.me.y]) <= 4) {
                return this.attack(i.x - this.me.x, i.y - this.me.y);
            }
        } else return;
    }
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
    if (this.fuel > 15) {
        if (route.length > 0) { //A* towards target
            return this.move(...route[0]);
        } else { //random move
            return this.move(...this.randomMove());
        }
    }
}
